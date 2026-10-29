/** Link to Mixpanel (EU residency), for the pages that look at every product and so at no single project. */
export const MIXPANEL_HOME_URL = 'https://eu.mixpanel.com';

/**
 * Builds the link that opens the Mixpanel project of a product (EU residency).
 * @param projectId the Mixpanel project id of the product.
 * @returns the link to the project.
 */
export function mixpanelProjectUrl(projectId: string): string {
  return `${MIXPANEL_HOME_URL}/project/${encodeURIComponent(projectId)}`;
}

/**
 * Builds the link that opens the inbox of an Intercom workspace.
 * @param appId the app id of the workspace, which differs between dev and prod.
 * @returns the link to the inbox.
 */
export function intercomInboxUrl(appId: string): string {
  return `https://app.intercom.com/a/inbox/${encodeURIComponent(appId)}/inbox`;
}
