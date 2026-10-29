/**
 * Opens an external or signed URL in a new tab without giving it a reference to Rocket (`window.opener`),
 * so the opened page cannot redirect the app tab.
 * @param url the URL to open.
 */
export function openInNewTab(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
