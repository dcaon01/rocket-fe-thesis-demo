import { Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideChevronDown, lucideListFilter } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmPopoverImports } from '@spartan-ng/helm/popover';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { ComboboxOption } from '../../interfaces/combobox-option.interface';

/**
 * Filter that picks several values out of a short list, such as statuses.
 * The value is null for «Tutti» (no filter), an empty list for «Nessuno» (the page reads nothing), the values picked otherwise.
 * Picking «Tutti» drops the single values; picking one value from «Tutti» keeps only that one.
 * The panel stays open while picking and closes on a click outside, like the date filter.
 * Usage: <rocket-multi-select-filter formControlName="status" [options]="statusOptions" />
 */
@Component({
  selector: 'rocket-multi-select-filter',
  imports: [
    ...HlmButtonImports,
    ...HlmPopoverImports,
    ...HlmSeparatorImports,
    NgIcon,
  ],
  providers: [
    provideIcons({ lucideCheck, lucideChevronDown, lucideListFilter }),
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MultiSelectFilterComponent), multi: true },
  ],
  templateUrl: './multi-select-filter.component.html',
})
export class MultiSelectFilterComponent implements ControlValueAccessor {
  /** Values that can be picked, with their labels. */
  options = input.required<ComboboxOption[]>();

  /** Id of the trigger button, for the label. */
  buttonId = input<string>();

  /** Values picked: null for every value. */
  value = signal<string[] | null>(null);

  /** Whether the filter is disabled. */
  disabled = signal<boolean>(false);

  /** Whether every value is picked, through «Tutti». */
  readonly isAll = computed(() => this.value() === null);

  /** Text of the trigger: every value, none, the one picked, or how many. */
  summary = computed(() => {
    const picked = this.value();
    if (picked === null) return 'Tutti';
    if (picked.length === 0) return 'Nessuno';
    if (picked.length === 1) return this.options().find(option => option.value === picked[0])?.label ?? picked[0];
    return `${picked.length} selezionati`;
  });

  /** Callback notifying the form of a change. */
  private _onChange: (value: string[] | null) => void = () => undefined;

  /** Callback notifying the form of a touch. */
  private _onTouched: () => void = () => undefined;

  /**
   * Writes the value of the form control.
   * @param value the values picked, null for every value.
   */
  writeValue(value: string[] | null): void {
    this.value.set(value);
  }

  /**
   * Registers the change callback.
   * @param fn the callback.
   */
  registerOnChange(fn: (value: string[] | null) => void): void {
    this._onChange = fn;
  }

  /**
   * Registers the touch callback.
   * @param fn the callback.
   */
  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  /**
   * Enables or disables the filter.
   * @param isDisabled whether the filter is disabled.
   */
  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  /**
   * Tells whether a single value is picked; under «Tutti» none is.
   * @param value the value.
   * @returns true when the value is picked.
   */
  isSelected(value: string): boolean {
    return this.value()?.includes(value) ?? false;
  }

  /**
   * Picks every value, or none when every value is already picked.
   */
  toggleAll(): void {
    this._set(this.isAll() ? [] : null);
  }

  /**
   * Picks a value, or drops it when already picked; from «Tutti» it keeps only that value.
   * @param value the value.
   */
  toggle(value: string): void {
    const picked = this.value() ?? [];
    this._set(this.isAll() ? [value] : this.isSelected(value) ? picked.filter(v => v !== value) : [...picked, value]);
  }

  /**
   * Stores a new value and notifies the form.
   * @param value the values picked, null for every value.
   */
  private _set(value: string[] | null): void {
    this.value.set(value);
    this._onChange(value);
    this._onTouched();
  }
}
