import { Component, forwardRef, input, signal, viewChild } from '@angular/core';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePencil, lucidePlus, lucideX } from '@ng-icons/lucide';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { ChipsRowComponent } from '../../../../components/chips-row/chips-row.component';

/**
 * Component providing an input field for entering multiple tags.
 * Implements ControlValueAccessor to integrate with Angular forms.
 * The trigger shows the tags on one row; clicking it opens a dialog where the tags
 * are added and removed, applied to the form only on confirmation.
 */
@Component({
  selector: 'rocket-tags-input',
  imports: [
    ReactiveFormsModule,
    ...HlmInputImports,
    ...HlmBadgeImports,
    ...HlmLabelImports,
    ...HlmButtonImports,
    ...HlmDialogImports,
    ...HlmTooltipImports,
    ...BrnDialogImports,
    NgIcon,
    ChipsRowComponent,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TagsInputComponent),
      multi: true,
    },
    provideIcons({
      lucidePencil,
      lucidePlus,
      lucideX
    })
  ],
  templateUrl: './tags-input.component.html',
  styleUrl: './tags-input.component.css'
})
export class TagsInputComponent implements ControlValueAccessor {
  /** Placeholder text displayed in the input when it's empty. */
  placeholder = input<string>('');

  /** Prefix text displayed before the input field. Useful for adding symbols like '$', '@', etc. */
  prefix = input<string>('');

  /** Suffix text displayed after the input field. Useful for adding units like '%', 'kg', etc. */
  suffix = input<string>('');

  /** Specifies the expected data type of the input value. Can be 'text' or 'number'. */
  inputType = input<'text' | 'number'>('text');

  /** Label text associated with the input field for accessibility and identification. */
  label = input<string>('');

  /** Indicates whether adding at least one tag is required for form validation. */
  required = input<boolean>(false);

  /** Whether the label above the field is left out, when the page shows its own. */
  hideLabel = input<boolean>(false);

  /** Reference to the editing dialog. */
  dialog = viewChild<BrnDialog>('dialog');

  /** Internal FormControl bound to the input of the dialog. */
  internalControl = new FormControl('');

  /** Tracks whether the component is in a disabled state. */
  disabled = false;

  /** Tags of the form control. */
  tags = signal<(string | number)[]>([]);

  /** Tags being edited in the dialog, applied on confirmation. */
  draft = signal<(string | number)[]>([]);

  /** Callback registered by Angular's form system, invoked when tags change. */
  onChange: (value: string[] | number[]) => void = () => {};

  /** Callback registered by Angular's form system, invoked when the component is touched. */
  onTouched: () => void = () => {};

  /**
   * Writes a new value to the component from the parent form.
   * @param value the new array of tags to be set in the component.
   */
  writeValue(value: (string | number)[] | null): void {
    this.tags.set(value || []);
  }

  /**
   * Registers the change callback used to notify the parent form.
   * @param fn the callback function to be invoked when the tags array changes.
   */
  registerOnChange(fn: (value: string[] | number[]) => void): void {
    this.onChange = fn;
  }

  /**
   * Registers the touched callback used to notify the parent form on user interaction.
   * @param fn the callback function to be invoked when the component is touched.
   */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /**
   * Sets the disabled state of the component.
   * @param isDisabled true if the component should be disabled, false otherwise.
   */
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    isDisabled ? this.internalControl.disable() : this.internalControl.enable();
  }

  /**
   * Opens the dialog on a copy of the tags.
   */
  openEditor(): void {
    this.draft.set([...this.tags()]);
    this.internalControl.setValue('');

    this.dialog()?.open();
  }

  /**
   * Adds the current input value to the tags being edited.
   * Trims whitespace, prevents duplicates and converts to number if needed.
   */
  addTag(): void {
    const value = this.internalControl.value?.trim();
    if (!value) return;

    const convertedValue = this.inputType() === 'number' ? Number(value) : value;
    if (this.draft().includes(convertedValue)) return;

    this.draft.update(tags => [...tags, convertedValue]);
    this.internalControl.setValue('');
  }

  /**
   * Removes a tag from the ones being edited.
   * @param index the index of the tag to remove.
   */
  removeTag(index: number): void {
    this.draft.update(tags => tags.filter((_, i) => i !== index));
  }

  /**
   * Applies the edited tags to the form and closes the dialog.
   */
  confirmEditor(): void {
    this.tags.set(this.draft());
    this.onChange(this._getConvertedTags());
    this.onTouched();

    this.dialog()?.close();
  }

  /**
   * Closes the dialog leaving the tags as they were.
   */
  cancelEditor(): void {
    this.onTouched();
    this.dialog()?.close();
  }

  /**
   * Converts the tags array to the correct primitive type based on inputType.
   * @returns the tags array typed as string[] or number[].
   */
  private _getConvertedTags(): string[] | number[] {
    if (this.inputType() === 'number') {
      return this.tags().map(tag => Number(tag));
    }
    return this.tags() as string[];
  }
}
