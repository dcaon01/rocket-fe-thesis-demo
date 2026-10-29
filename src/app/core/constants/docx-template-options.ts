import Docxtemplater from 'docxtemplater';
import { readPath } from '../utils/template-data.util';

/**
 * Options the DOCX templates are filled with. Delimiters, `paragraphLoop` and `linebreaks` must
 * match the ones rocket-be validates with (`DocxRendererService`), or a template the backend
 * accepts parses differently here; the parser reads dotted keys and a missing value prints nothing.
 */
export const DOCX_TEMPLATE_OPTIONS: Docxtemplater.DXT.ConstructorOptions = {
  delimiters: { start: '{{', end: '}}' },
  paragraphLoop: true,
  linebreaks: true,
  parser: tag => ({ get: (scope: unknown) => readPath(scope, tag) }),
  nullGetter: () => '',
  errorLogging: false,
};
