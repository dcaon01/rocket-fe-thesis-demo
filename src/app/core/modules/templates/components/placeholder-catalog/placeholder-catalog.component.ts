import { Component, computed, inject, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleCheck, lucideCopy, lucideImage, lucideRepeat } from '@ng-icons/lucide';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { CoreResponsePlaceholderCatalogDto, CoreTemplatePlaceholderCollection } from '../../../../../../../libs/api/src';
import { TemplateFormat } from '../../../../enums/template-format.enum';
import { ToasterService } from '../../../../services/toaster/toaster.service';

/**
 * Panel listing the placeholders a template may use, with the syntax of its format.
 * A click copies the tag, ready to be pasted in the editor or in Word; the ones the template uses are marked.
 * Usage: <rocket-placeholder-catalog [catalog]="catalog()" [used]="template.placeholders" />
 */
@Component({
  selector: 'rocket-placeholder-catalog',
  imports: [...HlmTooltipImports, NgIcon],
  providers: [
    provideIcons({
      lucideCircleCheck,
      lucideCopy,
      lucideImage,
      lucideRepeat,
    })
  ],
  templateUrl: './placeholder-catalog.component.html',
})
export class PlaceholderCatalogComponent {
  /** Toaster service instance. */
  private readonly _toasterService = inject(ToasterService);

  /** Catalog of the template scope. */
  catalog = input.required<CoreResponsePlaceholderCatalogDto>();

  /** Keys the saved template uses, a list field with the list key in front (`lines.seats`). */
  used = input<string[] | null | undefined>([]);

  /** Keys used, for the lookups of the panel. */
  private readonly _usedKeys = computed(() => new Set(this.used() ?? []));

  /** Single values written as tags. */
  readonly textPlaceholders = computed(() => this.catalog().placeholders.filter(placeholder => !placeholder.image));

  /** Values placed on an image through its alternative text. */
  readonly imagePlaceholders = computed(() => this.catalog().placeholders.filter(placeholder => placeholder.image));

  /** Whether the template is a Word file, which changes the loop syntax. */
  readonly isDocx = computed(() => this.catalog().format === TemplateFormat.Docx);

  /** Example of a root value read inside a Handlebars loop. */
  readonly parentExample = computed(() => this.tag(`../${this.textPlaceholders()[0]?.key ?? 'company.name'}`));

  /** Example of a section shown only when a value is present, on `financing` when the catalog has it. */
  readonly conditionExample = computed(() => {
    const keys = this.textPlaceholders().map(placeholder => placeholder.key);
    const key = keys.includes('financing') ? 'financing' : keys[0];
    if (!key) {
      return null;
    }
    return this.isDocx() ? `{{#${key}}} … {{/${key}}}` : `{{#if ${key}}} … {{/if}}`;
  });

  /**
   * Tells whether the saved template uses a key.
   * @param key the dotted key, a list field with the list key in front.
   * @returns whether it is used.
   */
  isUsed(key: string): boolean {
    return this._usedKeys().has(key);
  }

  /**
   * Returns the tag of a key.
   * @param key the dotted key.
   * @returns the tag.
   */
  tag(key: string): string {
    return `{{${key}}}`;
  }

  /**
   * Returns the opening and closing tags of a loop over a list, in the syntax of the format.
   * @param collection the list.
   * @returns the loop tags.
   */
  loopTags(collection: CoreTemplatePlaceholderCollection): string {
    return this.isDocx()
      ? `{{#${collection.key}}} … {{/${collection.key}}}`
      : `{{#each ${collection.key}}} … {{/each}}`;
  }

  /**
   * Copies a text to the clipboard.
   * @param text the text to copy.
   */
  copy(text: string): void {
    navigator.clipboard.writeText(text).then(
      () => this._toasterService.showSuccess(`Copiato: ${text}`),
      () => this._toasterService.showError('Copia negli appunti non riuscita.'),
    );
  }
}
