import { Component, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideFileUp, lucideX } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmItemImports } from '@spartan-ng/helm/item';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { FileDropZoneDirective } from '../../directives/file-drop-zone.directive';

/**
 * Box that takes one file, dropped on it or chosen with its button, in the style of the material file.
 * Usage: <rocket-file-drop accept="application/pdf" hint="PDF." [fileName]="file()?.name ?? null" (fileSelected)="..." (cleared)="..." />
 */
@Component({
  selector: 'rocket-file-drop',
  imports: [
    ...HlmButtonImports,
    ...HlmItemImports,
    ...HlmTooltipImports,
    FileDropZoneDirective,
    NgIcon,
  ],
  providers: [
    provideIcons({
      lucideFileUp,
      lucideX,
    })
  ],
  templateUrl: './file-drop.component.html',
})
export class FileDropComponent {
  /** Name of the chosen file, null while none is chosen. */
  fileName = input<string | null>(null);

  /** Types the file input accepts. */
  accept = input<string>('');

  /** What the file can be, shown while none is chosen. */
  hint = input<string>('');

  /** Whether choosing a file is blocked. */
  disabled = input<boolean>(false);

  /** Emits the file dropped or chosen. */
  fileSelected = output<File>();

  /** Emits when the chosen file is discarded. */
  cleared = output<void>();

  /**
   * Takes the file chosen with the button.
   * @param event the change event of the file input.
   */
  onFileChosen(event: Event): void {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (file) this.fileSelected.emit(file);
  }
}
