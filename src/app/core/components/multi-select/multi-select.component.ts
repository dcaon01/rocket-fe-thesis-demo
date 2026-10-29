import { Component, computed, forwardRef, input, signal, viewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePencil, lucideSearch } from '@ng-icons/lucide';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { ChipsRowComponent } from '../chips-row/chips-row.component';

/**
 * Choice of several values among fixed options. The trigger shows the chosen values on one row; clicking it opens a
 * dialog with a checkbox per option, applied to the form only on confirmation.
 * Usage: <rocket-multi-select formControlName="roles" [options]="roles()" title="Ruoli" />
 */
@Component({
  selector: 'rocket-multi-select',
  imports: [
    ...BrnDialogImports,
    ...HlmButtonImports,
    ...HlmCheckboxImports,
    ...HlmDialogImports,
    ...HlmInputImports,
    ...HlmInputGroupImports,
    ...HlmLabelImports,
    ...HlmTooltipImports,
    NgIcon,
    ChipsRowComponent,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MultiSelectComponent),
      multi: true,
    },
    provideIcons({ lucidePencil, lucideSearch }),
  ],
  templateUrl: './multi-select.component.html',
})
export class MultiSelectComponent implements ControlValueAccessor {
  /** Options to choose from. */
  options = input.required<string[]>();

  /** Title of the dialog. */
  title = input.required<string>();

  /** Text of the trigger while nothing is chosen. */
  placeholder = input<string>('Nessuna selezione');

  /** Id of the trigger, for the label of the page. */
  inputId = input<string>('');

  /** Reference to the dialog. */
  dialog = viewChild<BrnDialog>('dialog');

  /** Values of the form control. */
  value = signal<string[]>([]);

  /** Values being chosen in the dialog, applied on confirmation. */
  draft = signal<ReadonlySet<string>>(new Set());

  /** Text filtering the options of the dialog. */
  search = signal<string>('');

  /** Options matching the search. */
  readonly filteredOptions = computed(() => {
    const search = this.search().trim().toLowerCase();

    return this.options().filter(option => option.toLowerCase().includes(search));
  });

  /** Whether the component is disabled. */
  disabled = false;

  /** Callback registered by Angular's form system, invoked when the value changes. */
  onChange: (value: string[]) => void = () => {};

  /** Callback registered by Angular's form system, invoked when the component is touched. */
  onTouched: () => void = () => {};

  /**
   * Writes a new value to the component from the parent form.
   * @param value the chosen values.
   */
  writeValue(value: string[] | null): void {
    this.value.set(value ?? []);
  }

  /**
   * Registers the change callback used to notify the parent form.
   * @param fn the callback.
   */
  registerOnChange(fn: (value: string[]) => void): void {
    this.onChange = fn;
  }

  /**
   * Registers the touched callback used to notify the parent form.
   * @param fn the callback.
   */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /**
   * Sets the disabled state of the component.
   * @param isDisabled whether the component is disabled.
   */
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  /**
   * Opens the dialog on a copy of the chosen values.
   */
  openEditor(): void {
    this.draft.set(new Set(this.value()));
    this.search.set('');

    this.dialog()?.open();
  }

  /**
   * Adds an option to the values being chosen, or removes it.
   * @param option the option.
   */
  toggle(option: string): void {
    this.draft.update(draft => {
      const next = new Set(draft);
      if (!next.delete(option)) {
        next.add(option);
      }
      return next;
    });
  }

  /**
   * Applies the chosen values, in the order of the options, and closes the dialog.
   */
  confirmEditor(): void {
    const chosen = this.options().filter(option => this.draft().has(option));
    this.value.set(chosen);
    this.onChange(chosen);
    this.onTouched();

    this.dialog()?.close();
  }

  /**
   * Closes the dialog leaving the values as they were.
   */
  cancelEditor(): void {
    this.onTouched();
    this.dialog()?.close();
  }
}
