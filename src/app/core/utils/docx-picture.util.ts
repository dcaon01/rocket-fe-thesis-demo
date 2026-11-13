import PizZip from 'pizzip';

/** Parts of a DOCX that may carry a picture placeholder: the body, the headers and the footers. */
const PICTURE_PARTS = /^word\/(document|header\d+|footer\d+)\.xml$/;

/** A drawing element, the container of an image in WordprocessingML. */
const DRAWING = /<w:drawing>[\s\S]*?<\/w:drawing>/g;

/** Relationship type of an embedded image. */
const IMAGE_RELATIONSHIP = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image';

/** A picture Word embeds as it is, with its size in pixels. */
interface Picture {
  /** Extension of the media file inside the DOCX. */
  extension: 'png' | 'jpeg';
  /** MIME type registered for the extension. */
  contentType: string;
  /** Width in pixels. */
  width: number;
  /** Height in pixels. */
  height: number;
}

/**
 * Reads the format and the size of a PNG or JPEG from its header.
 * @param content the image bytes.
 * @returns the picture, or undefined for any other format or a truncated file.
 */
export function readPicture(content: Uint8Array): Picture | undefined {
  const view = new DataView(content.buffer, content.byteOffset, content.byteLength);
  if (content.length >= 24 && view.getUint32(0) === 0x89504e47) {
    return { extension: 'png', contentType: 'image/png', width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (content.length < 4 || content[0] !== 0xff || content[1] !== 0xd8) {
    return undefined;
  }
  // Walks the JPEG segments up to the frame header, which carries the size.
  let offset = 2;
  while (offset + 9 < content.length) {
    if (content[offset] !== 0xff) {
      return undefined;
    }
    const marker = content[offset + 1];
    const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrame) {
      return { extension: 'jpeg', contentType: 'image/jpeg', height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) };
    }
    offset += 2 + view.getUint16(offset + 2);
  }
  return undefined;
}

/**
 * Places the pictures on the images whose alternative text names them, fitting each one
 * in the box drawn in Word without stretching it.
 * @param zip the DOCX, changed in place.
 * @param pictures the picture of each key; a key without one has its image removed.
 * @returns the keys whose picture is not a readable PNG or JPEG, removed as well.
 */
export function placePictures(zip: PizZip, pictures: Map<string, Uint8Array | undefined>): string[] {
  const imageKeys = [...pictures.keys()];
  const unreadable = new Set<string>();
  const decoded = new Map<string, Picture>();
  for (const [key, content] of pictures) {
    const picture = content && readPicture(content);
    if (picture && content) {
      decoded.set(key, picture);
      zip.file(mediaPath(key, picture), content);
      registerContentType(zip, picture);
    } else if (content) {
      unreadable.add(key);
    }
  }

  for (const part of pictureParts(zip)) {
    let relationships = zip.file(part.relsPath)?.asText();
    const xml = part.xml.replace(DRAWING, drawing => {
      const key = altTextKey(drawing, imageKeys);
      if (!key || !pictures.has(key)) {
        return drawing;
      }
      const picture = decoded.get(key);
      if (!picture || relationships === undefined) {
        return '';
      }
      const relationshipId = `rIdRocket${slug(key)}`;
      if (!relationships.includes(`Id="${relationshipId}"`)) {
        relationships = relationships.replace(
          '</Relationships>',
          `<Relationship Id="${relationshipId}" Type="${IMAGE_RELATIONSHIP}" Target="${mediaPath(key, picture).replace('word/', '')}"/></Relationships>`,
        );
      }
      return fitDrawing(drawing.replace(/(<a:blip\b[^>]*\br:embed=")[^"]*"/, `$1${relationshipId}"`), picture);
    });
    zip.file(part.path, xml);
    if (relationships !== undefined) {
      zip.file(part.relsPath, relationships);
    }
  }
  return [...unreadable];
}

/**
 * Returns the parts that may carry a picture, with their XML and the path of their relationships.
 * @param zip the DOCX.
 * @returns the parts.
 */
function pictureParts(zip: PizZip): { path: string; relsPath: string; xml: string }[] {
  return Object.keys(zip.files)
    .filter(path => PICTURE_PARTS.test(path))
    .map(path => ({
      path,
      relsPath: path.replace(/^word\/(.+)$/, 'word/_rels/$1.rels'),
      xml: zip.file(path)?.asText() ?? '',
    }));
}

/**
 * Reads the key written in the alternative text of a drawing.
 * @param drawing the drawing element.
 * @param imageKeys the picture keys, recognized even without braces.
 * @returns the key, or undefined when the text is an ordinary description.
 */
function altTextKey(drawing: string, imageKeys: string[]): string | undefined {
  const properties = /<wp:docPr\b[^>]*>/.exec(drawing)?.[0] ?? '';
  const text = (/\bdescr="([^"]*)"/.exec(properties)?.[1] ?? /\btitle="([^"]*)"/.exec(properties)?.[1] ?? '').trim();
  const braced = /^\{\{\s*([^{}]+?)\s*\}\}$/.exec(text);
  if (braced) {
    return braced[1];
  }
  return imageKeys.includes(text) ? text : undefined;
}

/**
 * Shrinks the box of a drawing to the proportions of the picture, keeping it inside the original box.
 * @param drawing the drawing element.
 * @param picture the picture placed in it.
 * @returns the drawing with the new extent.
 */
function fitDrawing(drawing: string, picture: Picture): string {
  const extent = /<wp:extent cx="(\d+)" cy="(\d+)"/.exec(drawing);
  if (!extent || !picture.width || !picture.height) {
    return drawing;
  }
  const [box, boxWidth, boxHeight] = [extent[0], Number(extent[1]), Number(extent[2])];
  const scale = Math.min(boxWidth / picture.width, boxHeight / picture.height);
  const width = Math.round(picture.width * scale);
  const height = Math.round(picture.height * scale);
  // The same size appears twice: the anchor extent and the shape transform.
  return drawing.split(box.replace('<wp:extent ', '')).join(`cx="${width}" cy="${height}"`);
}

/**
 * Declares the extension of a picture in the package content types, when missing.
 * @param zip the DOCX.
 * @param picture the picture to declare.
 */
function registerContentType(zip: PizZip, picture: Picture): void {
  const contentTypes = zip.file('[Content_Types].xml')?.asText();
  if (!contentTypes || new RegExp(`Extension="${picture.extension}"`, 'i').test(contentTypes)) {
    return;
  }
  zip.file(
    '[Content_Types].xml',
    contentTypes.replace('</Types>', `<Default Extension="${picture.extension}" ContentType="${picture.contentType}"/></Types>`),
  );
}

/**
 * Returns the path of the media file that holds the picture of a key.
 * @param key the picture key.
 * @param picture the picture.
 * @returns the path inside the DOCX.
 */
function mediaPath(key: string, picture: Picture): string {
  return `word/media/rocket-${slug(key)}.${picture.extension}`;
}

/**
 * Reduces a key to characters safe in a file name and in a relationship id.
 * @param key the picture key.
 * @returns the slug.
 */
function slug(key: string): string {
  return key.replace(/[^A-Za-z0-9]+/g, '-');
}
