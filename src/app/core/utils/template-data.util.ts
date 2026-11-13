import { CoreResponsePlaceholderCatalogDto } from '../../../../libs/api/src';

/** Data passed to a template: nested objects and lists of objects, values already formatted, pictures as PNG or JPEG bytes. */
export type TemplateData = Record<string, unknown>;

/**
 * Reads the value at a dotted path, the way the placeholders address it.
 * @param scope the object to read from.
 * @param path the dotted path, or `.` for the object itself.
 * @returns the value, or undefined.
 */
export function readPath(scope: unknown, path: string): unknown {
  if (path === '.') {
    return scope;
  }
  let node = scope;
  for (const part of path.split('.')) {
    if (node === null || typeof node !== 'object') {
      return undefined;
    }
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

/**
 * Builds the sample data of a catalog, with two items per list; pictures are left out,
 * so the preview keeps the image the template was drawn with.
 * @param catalog the placeholders of the scope.
 * @returns the nested sample data.
 */
export function sampleData(catalog: CoreResponsePlaceholderCatalogDto): TemplateData {
  const data: TemplateData = {};
  for (const placeholder of catalog.placeholders.filter(placeholder => !placeholder.image)) {
    writePath(data, placeholder.key, placeholder.example);
  }
  for (const collection of catalog.collections) {
    const item: TemplateData = {};
    for (const field of collection.fields) {
      writePath(item, field.key, field.example);
    }
    data[collection.key] = [item, item];
  }
  return data;
}

/**
 * Returns the picture keys of a catalog.
 * @param catalog the placeholders of the scope.
 * @returns the keys whose value is a picture.
 */
export function pictureKeys(catalog: CoreResponsePlaceholderCatalogDto): string[] {
  return catalog.placeholders.filter(placeholder => placeholder.image).map(placeholder => placeholder.key);
}

/**
 * Writes a value at a dotted path, creating the intermediate objects.
 * @param target the object to write into.
 * @param key the dotted key.
 * @param value the value to write.
 */
function writePath(target: TemplateData, key: string, value: unknown): void {
  const parts = key.split('.');
  let node = target;
  for (const part of parts.slice(0, -1)) {
    node[part] = (node[part] as TemplateData | undefined) ?? {};
    node = node[part] as TemplateData;
  }
  node[parts[parts.length - 1]] = value;
}
