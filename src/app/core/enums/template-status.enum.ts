/**
 * Enum describing the lifecycle state of a document template.
 * Only a draft is editable; publishing one withdraws the template in force for its scope,
 * and a published template changes by duplicating it and publishing the copy.
 */
export enum TemplateStatus {
  /** Template being prepared, not used to generate documents. */
  Draft = 'DRAFT',
  /** Template in force for its scope. */
  Published = 'PUBLISHED',
  /** Template replaced or withdrawn, kept for the documents it generated. */
  Withdrawn = 'WITHDRAWN',
}
