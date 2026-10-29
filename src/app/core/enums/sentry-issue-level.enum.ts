/**
 * Level of an issue of a product on Sentry, as the API returns it.
 */
export enum SentryIssueLevel {
  Fatal = 'fatal',
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
  Debug = 'debug',
}
