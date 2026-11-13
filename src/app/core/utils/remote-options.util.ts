import { Signal, signal, WritableSignal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, map, Observable, of, switchMap, tap } from 'rxjs';
import { ComboboxOption } from '../interfaces/combobox-option.interface';

/** Number of options a searchable combobox reads at a time. */
export const COMBOBOX_PAGE_SIZE = 20;

/** Options of a combobox searched on the backend. */
export interface RemoteOptions {
  /** Text typed in the combobox. */
  search: WritableSignal<string>;
  /** Options matching the text. */
  options: Signal<ComboboxOption[]>;
  /** Label of a value among the options read or remembered so far, undefined otherwise. */
  labelOf: (value: string) => string | undefined;
  /** Remembers the label of a value read elsewhere, such as the one already saved in a form. */
  remember: (option: ComboboxOption) => void;
}

/**
 * Builds the options of a combobox searched on the backend: as the user types, the first page of the items
 * whose text starts with what was typed. Call it in an injection context, such as a field initializer.
 * Usage: <hlm-combobox (searchChange)="resellers.search.set($event)"> … @for (option of resellers.options(); …)
 * @param fetch reads the options matching a text, absent when nothing is typed.
 * @returns the search text, the options and the labels read so far, reactive so a label read later still shows.
 */
export function remoteOptions(fetch: (search: string | undefined) => Observable<ComboboxOption[]>): RemoteOptions {
  const search = signal<string>('');
  const labels = signal<ReadonlyMap<string, string>>(new Map());
  const remember = (...read: ComboboxOption[]): void =>
    labels.update(known => new Map([...known, ...read.map(option => [option.value, option.label] as const)]));
  const options = toSignal(
    toObservable(search).pipe(
      debounceTime(300),
      map(text => text.trim()),
      distinctUntilChanged(),
      switchMap(text => fetch(text || undefined).pipe(catchError(() => of([] as ComboboxOption[])))),
      tap(read => remember(...read)),
    ),
    { initialValue: [] as ComboboxOption[] },
  );
  return { search, options, labelOf: value => labels().get(value), remember: option => remember(option) };
}
