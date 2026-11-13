import { Directive, input, output, signal } from '@angular/core';

/**
 * Directive that takes the files dropped on its host, and highlights the host while files are dragged over it.
 * Other drags, such as a text moved into a field, keep their native behavior.
 * The host stays the upload box it is: the directive only adds the drop.
 * Usage: <div rocketFileDropZone [fileDropDisabled]="readonly()" (filesDropped)="onFilesDropped($event)">…</div>
 */
@Directive({
  selector: '[rocketFileDropZone]',
  host: {
    '[class.border-primary]': 'isDragOver()',
    '[class.bg-primary/5]': 'isDragOver()',
    '(dragover)': 'onDragOver($event)',
    '(dragleave)': 'onDragLeave($event)',
    '(drop)': 'onDrop($event)',
  },
})
export class FileDropZoneDirective {
  /** Whether dropping files is blocked. */
  fileDropDisabled = input<boolean>(false);

  /** Emits the files dropped, in the order the browser gives them. */
  filesDropped = output<File[]>();

  /** Whether files are being dragged over the host. */
  readonly isDragOver = signal<boolean>(false);

  /**
   * Shows the host as ready to take the files.
   * @param event the drag event.
   */
  onDragOver(event: DragEvent): void {
    if (!this._hasFiles(event)) return;
    event.preventDefault();
    if (!this.fileDropDisabled()) this.isDragOver.set(true);
  }

  /**
   * Leaves the ready state when the files go out of the host, not when they pass over one of its children.
   * @param event the drag event.
   */
  onDragLeave(event: DragEvent): void {
    const host = event.currentTarget as HTMLElement;
    if (host.contains(event.relatedTarget as Node | null)) return;
    this.isDragOver.set(false);
  }

  /**
   * Takes the files dropped on the host.
   * @param event the drag event.
   */
  onDrop(event: DragEvent): void {
    if (!this._hasFiles(event)) return;
    event.preventDefault();
    this.isDragOver.set(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length && !this.fileDropDisabled()) this.filesDropped.emit(files);
  }

  /**
   * Tells whether the drag carries files: a text dragged into a field keeps its native drop.
   * @param event the drag event.
   * @returns true when files are dragged.
   */
  private _hasFiles(event: DragEvent): boolean {
    return event.dataTransfer?.types.includes('Files') ?? false;
  }
}
