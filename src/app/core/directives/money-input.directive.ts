import { Directive, ElementRef, forwardRef, HostListener, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/** Decimal digits an amount in euros keeps. */
const MONEY_DECIMALS = 2;

/**
 * Directive that lets an amount in euros be typed the Italian way: dot for thousands, comma for decimals.
 * The form control holds a plain number, the field shows it grouped.
 * Usage: <input rocketMoneyInput formControlName="price" />
 */
@Directive({
  selector: 'input[rocketMoneyInput]',
  host: { type: 'text', inputmode: 'decimal', autocomplete: 'off' },
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MoneyInputDirective), multi: true }],
})
export class MoneyInputDirective implements ControlValueAccessor {
  /** Reference to the host input. */
  private readonly _el = inject<ElementRef<HTMLInputElement>>(ElementRef);

  /** Callback that sends the number to the form control. */
  private _onChange: (value: number | null) => void = () => undefined;

  /** Callback that marks the form control as touched. */
  private _onTouched: () => void = () => undefined;

  /**
   * Shows the number the form control holds.
   * @param value the number of the form control.
   */
  writeValue(value: number | null): void {
    this._el.nativeElement.value = value === null || value === undefined ? '' : this._format(value);
  }

  /**
   * Registers the callback that sends the number to the form control.
   * @param fn the callback.
   */
  registerOnChange(fn: (value: number | null) => void): void {
    this._onChange = fn;
  }

  /**
   * Registers the callback that marks the form control as touched.
   * @param fn the callback.
   */
  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  /**
   * Enables or disables the host input.
   * @param isDisabled whether the form control is disabled.
   */
  setDisabledState(isDisabled: boolean): void {
    this._el.nativeElement.disabled = isDisabled;
  }

  /**
   * Cleans what was typed, groups the thousands and sends the number to the form control.
   */
  @HostListener('input')
  onInput(): void {
    const input = this._el.nativeElement;
    const caret = input.selectionStart ?? input.value.length;
    const significantBeforeCaret = input.value.slice(0, caret).replace(/[^\d,]/g, '').length;

    input.value = this._group(input.value);
    this._moveCaret(significantBeforeCaret);
    this._onChange(this._parse(input.value));
  }

  /**
   * Shows the amount with its two decimals and marks the form control as touched.
   */
  @HostListener('blur')
  onBlur(): void {
    const input = this._el.nativeElement;
    const value = this._parse(input.value);
    if (value !== null) input.value = this._format(value);
    this._onTouched();
  }

  /**
   * Formats a number the Italian way, with the thousands grouped and two decimals.
   * @param value the number to format.
   * @returns the formatted amount.
   */
  private _format(value: number): string {
    return this._group(value.toFixed(MONEY_DECIMALS).replace('.', ','));
  }

  /**
   * Keeps digits and the first comma of what was typed, then groups the thousands with dots.
   * @param text the text of the input.
   * @returns the cleaned and grouped text.
   */
  private _group(text: string): string {
    const [integerPart, ...rest] = text.replace(/[^\d,]/g, '').split(',');
    const integer = integerPart.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    if (rest.length === 0) return integer;

    return `${integer || '0'},${rest.join('').slice(0, MONEY_DECIMALS)}`;
  }

  /**
   * Reads the number of a grouped text.
   * @param text the grouped text.
   * @returns the number, or null when the text is empty.
   */
  private _parse(text: string): number | null {
    const normalized = text.replace(/\./g, '').replace(',', '.');
    return normalized === '' ? null : Number(normalized);
  }

  /**
   * Puts the caret after the same digits it followed before the text was grouped.
   * @param significantBeforeCaret the digits and comma before the caret, as typed.
   */
  private _moveCaret(significantBeforeCaret: number): void {
    const input = this._el.nativeElement;
    let seen = 0;
    let position = 0;

    while (position < input.value.length && seen < significantBeforeCaret) {
      if (input.value[position] !== '.') seen++;
      position++;
    }

    input.setSelectionRange(position, position);
  }
}
