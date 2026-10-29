import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import Handlebars from 'handlebars';
import PizZip from 'pizzip';
import { Observable, switchMap } from 'rxjs';
import { CoreResponsePlaceholderCatalogDto } from '../../../../../libs/api/src';
import { DOCX_TEMPLATE_OPTIONS } from '../../constants/docx-template-options';
import { placePictures } from '../../utils/docx-picture.util';
import { pictureKeys, readPath, TemplateData } from '../../utils/template-data.util';
import { S3CoreEntityType, S3UploadService } from '../api-services/s3/s3-upload.service';
import { ToasterService } from '../toaster/toaster.service';

/** MIME type of a Word document. */
const DOCX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** How long a preview tab keeps its object URL, in milliseconds. */
const PREVIEW_URL_LIFETIME = 60_000;

/**
 * Policy placed at the top of every opened document: the tab shares the app origin, so a script
 * or an event handler in a template would reach the session. Styles, fonts and images still load.
 */
const NO_SCRIPT_POLICY = `<meta http-equiv="Content-Security-Policy" content="script-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">`;

/**
 * Service that fills the document templates in the browser: offers, contracts and client sheets
 * are rendered here from the data at hand and handed to the user, never stored.
 * HTML templates go through Handlebars, DOCX templates through docxtemplater.
 */
@Injectable({
  providedIn: 'root'
})
export class DocumentRenderService {
  /** HTTP client instance, used to read files from S3. */
  private readonly _http = inject(HttpClient);

  /** S3 upload service instance, used to sign the downloads. */
  private readonly _s3UploadService = inject(S3UploadService);

  /** Toaster service instance. */
  private readonly _toasterService = inject(ToasterService);

  /** Isolated Handlebars environment, so that no helper registered elsewhere leaks in. */
  private readonly _handlebars = Handlebars.create();

  /**
   * Fills an HTML template; values are escaped, and only the built-in helpers are allowed.
   * @param source the template source.
   * @param data the values to fill in.
   * @returns the rendered HTML.
   */
  renderHtml(source: string, data: TemplateData): string {
    return this._handlebars.compile(source, { knownHelpersOnly: true })(data);
  }

  /**
   * Opens a new tab and shows an HTML document in it, ready to be printed to PDF, with scripts disabled.
   * The tab opens right away, inside the click, so that the browser does not block it
   * while the document is still being prepared.
   * @param html$ the document to show.
   */
  openHtml(html$: Observable<string>): void {
    const preview = window.open('', '_blank');
    if (!preview) {
      this._toasterService.showError('Il browser ha bloccato la nuova scheda: consenti i popup per questo sito.');
      return;
    }
    html$.subscribe({
      next: html => {
        const url = URL.createObjectURL(new Blob([this._withoutScripts(html)], { type: 'text/html' }));
        preview.location.replace(url);
        setTimeout(() => URL.revokeObjectURL(url), PREVIEW_URL_LIFETIME);
      },
      error: error => {
        console.error('HTML document could not be rendered', error);
        preview.close();
      },
    });
  }

  /**
   * Fills a DOCX template and places its pictures.
   * @param source the DOCX source.
   * @param data the values to fill in, pictures as PNG or JPEG bytes.
   * @param catalog the placeholders of the scope, which tell which keys are pictures.
   * @param keepMissingPictures whether an image without a picture stays as drawn, as the preview wants.
   * @returns the rendered DOCX.
   */
  renderDocx(source: ArrayBuffer, data: TemplateData, catalog: CoreResponsePlaceholderCatalogDto, keepMissingPictures: boolean): Blob {
    const document = new Docxtemplater(new PizZip(source), DOCX_TEMPLATE_OPTIONS);
    document.render(data);
    const zip = document.getZip() as PizZip;

    const pictures = new Map<string, Uint8Array | undefined>();
    for (const key of pictureKeys(catalog)) {
      const value = readPath(data, key);
      if (value instanceof Uint8Array) {
        pictures.set(key, value);
      } else if (!keepMissingPictures) {
        pictures.set(key, undefined);
      }
    }
    for (const key of placePictures(zip, pictures)) {
      console.error(`Picture ${key} is not a PNG or JPEG: its image is removed from the document.`);
    }
    return zip.generate({ type: 'blob', mimeType: DOCX_CONTENT_TYPE, compression: 'DEFLATE' });
  }

  /**
   * Reads a file stored on S3, such as a DOCX source or a reseller logo.
   * @param entityType the entity type the file belongs to.
   * @param s3Key the S3 key of the file.
   * @returns the file content.
   */
  loadFile(entityType: S3CoreEntityType, s3Key: string): Observable<ArrayBuffer> {
    return this._s3UploadService.getDownloadUrl(entityType, s3Key).pipe(
      switchMap(url => this._http.get(url, { responseType: 'arraybuffer' }))
    );
  }

  /**
   * Hands a generated document to the user as a download.
   * @param document the document.
   * @param filename the name the file is saved with.
   */
  download(document: Blob, filename: string): void {
    saveAs(document, filename);
  }

  /**
   * Puts the no-script policy before any content of the document, right after the doctype so
   * that the page keeps its standards mode; the policy only binds what the browser parses after it.
   * @param html the document.
   * @returns the document with the policy.
   */
  private _withoutScripts(html: string): string {
    const doctype = /^\s*<!doctype[^>]*>/i.exec(html)?.[0] ?? '';
    return `${doctype}${NO_SCRIPT_POLICY}${html.slice(doctype.length)}`;
  }
}
