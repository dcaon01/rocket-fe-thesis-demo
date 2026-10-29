/**
 * Keeps a same-origin frame as tall as its document, so that the page scrolls instead of the frame.
 * The height follows the document as pictures and fonts load after the first layout.
 * @param event the load event of the frame.
 */
export function fitFrameToContent(event: Event): void {
  const frame = event.target as HTMLIFrameElement;
  const document = frame.contentDocument;
  if (!document?.body) return;

  const fit = () => frame.style.height = `${document.documentElement.scrollHeight}px`;
  fit();
  new ResizeObserver(fit).observe(document.body);
}
