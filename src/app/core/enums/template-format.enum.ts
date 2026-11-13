/**
 * Enum describing the format of a template, decided by its type and channel.
 * HTML templates are written in the page, DOCX templates are uploaded as Word files.
 */
export enum TemplateFormat {
  Html = 'HTML',
  Docx = 'DOCX',
}
