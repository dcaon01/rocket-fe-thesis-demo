import { Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCalendar, lucideChevronDown } from '@ng-icons/lucide';
import { BrnDialogState } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCalendarImports } from '@spartan-ng/helm/calendar';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmPopoverImports } from '@spartan-ng/helm/popover';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { DateRange } from '../../interfaces/date-range.interface';

/** Bound of the period the calendar is picking. */
type DateRangeMode = 'from' | 'to';

/**
 * Date filter in a single field: from a day, up to a day, or both; each bound is picked on its own.
 * Usage: <rocket-date-range-filter formControlName="period" />
 */
@Component({
  selector: 'rocket-date-range-filter',
  imports: [
    ...HlmButtonImports,
    ...HlmCalendarImports,
    ...HlmIconImports,
    ...HlmPopoverImports,
    ...HlmToggleGroupImports,
    NgIcon,
  ],
  providers: [
    provideIcons({ lucideCalendar, lucideChevronDown }),
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DateRangeFilterComponent), multi: true },
  ],
  templateUrl: './date-range-filter.component.html',
})
export class DateRangeFilterComponent implements ControlValueAccessor {
  /** Id of the trigger button, for the label. */
  buttonId = input<string>();

  /** Period picked. */
  value = signal<DateRange>({ from: null, to: null });

  /** Bound the calendar is picking. */
  mode = signal<DateRangeMode>('from');

  /** Whether the filter is disabled. */
  disabled = signal<boolean>(false);

  /** State of the popover. */
  popoverState = signal<BrnDialogState | null>(null);

  /** Text of the trigger: any date, from a day, up to a day, or the period. */
  summary = computed(() => {
    const { from, to } = this.value();
    if (from && to) return `${this._format(from)} - ${this._format(to)}`;
    if (from) return `Dal ${this._format(from)}`;
    if (to) return `Fino al ${this._format(to)}`;
    return 'Qualsiasi data';
  });

  /** Callback notifying the form of a change. */
  private _onChange: (value: DateRange) => void = () => undefined;

  /** Callback notifying the form of a touch. */
  private _onTouched: () => void = () => undefined;

  /**
   * Writes the value of the form control.
   * @param value the period.
   */
  writeValue(value: DateRange | null): void {
    this.value.set(value ?? { from: null, to: null });
    this.mode.set('from');
  }

  /**
   * Registers the change callback.
   * @param fn the callback.
   */
  registerOnChange(fn: (value: DateRange) => void): void {
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
   * Switches the bound the calendar picks.
   * @param mode the bound.
   */
  setMode(mode: DateRangeMode | DateRangeMode[] | null | undefined): void {
    if (typeof mode === 'string') this.mode.set(mode);
  }

  /**
   * Picks the start of the period, keeping its end, then moves to the end.
   * @param date the day.
   */
  pickFrom(date: Date | undefined): void {
    if (!date) return;
    this._save({ from: date, to: this.value().to });
    this.mode.set('to');
  }

  /**
   * Picks the end of the period, keeping its start, and closes the calendar.
   * @param date the day.
   */
  pickTo(date: Date | undefined): void {
    if (!date) return;
    this._save({ from: this.value().from, to: date });
    this.popoverState.set('closed');
  }

  /**
   * Empties the filter.
   */
  clear(): void {
    this._save({ from: null, to: null });
    this.mode.set('from');
    this.popoverState.set('closed');
  }

  /**
   * Saves a period and notifies the form.
   * @param period the period.
   */
  private _save(period: DateRange): void {
    this.value.set(period);
    this._onChange(period);
    this._onTouched();
  }

  /**
   * Formats a day as dd/MM/yyyy.
   * @param date the day.
   * @returns the formatted day.
   */
  private _format(date: Date): string {
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  }
}
