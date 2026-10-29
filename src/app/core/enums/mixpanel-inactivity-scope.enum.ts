/**
 * What an inactivity rule looks at: the worst silence among the tenant, its users or its objects.
 */
export enum MixpanelInactivityScope {
  /* Time since the last event of the tenant. */
  Tenant = 'TENANT',
  /* Longest silence among the active users. */
  User = 'USER',
  /* Longest silence among the open objects. */
  Object = 'OBJECT',
}
