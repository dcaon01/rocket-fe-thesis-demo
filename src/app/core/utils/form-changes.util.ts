import { DestroyRef, inject, Signal, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, PristineChangeEvent, ValueChangeEvent } from '@angular/forms';

/**
 * Tells whether a form holds changes to save: touched, and with a value other than the one it was loaded with, so
 * bringing a field back to where it was leaves nothing to save. The reference is the value the form keeps while
 * pristine, taken again whenever it is marked pristine, as after a save. A value changed while pristine becomes the
 * reference only once the change is over: code that changes a value and then marks the form dirty, as removing a row
 * does, leaves a change to save. Call it in an injection context.
 * Usage: readonly changed = formChanges(this.orderForm); … [disabled]="!form.changed()"
 * @param form the form to watch.
 * @returns whether the form differs from its reference value.
 */
export function formChanges(form: AbstractControl): Signal<boolean> {
  const destroyRef = inject(DestroyRef);
  const serialize = (): string => JSON.stringify(form.getRawValue());
  let reference = serialize();
  const changed = signal<boolean>(false);
  const refresh = (): void => changed.set(form.dirty && serialize() !== reference);

  form.events.pipe(takeUntilDestroyed(destroyRef)).subscribe(event => {
    if (event instanceof PristineChangeEvent && event.pristine) reference = serialize();
    if (event instanceof ValueChangeEvent && form.pristine) {
      queueMicrotask(() => {
        if (form.pristine) reference = serialize();
        refresh();
      });
    }
    refresh();
  });
  return changed.asReadonly();
}
