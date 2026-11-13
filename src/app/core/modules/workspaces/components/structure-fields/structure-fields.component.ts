import { Component, computed, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLock } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSwitchImports } from '@spartan-ng/helm/switch';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { CoreStructureField } from '../../../../../../../libs/api/src';
import { TypePipe } from '../../../../pipes/type/type.pipe';
import { TagsInputComponent } from '../tags-input/tags-input.component';

/**
 * Fields of a product structure (tenant or user data), bound to a form group built by StructureDynamicFormService.
 * Each field shows by its type; the generated ones are filled by the product and show only once the record exists,
 * when the fields marked not modifiable are locked too.
 */
@Component({
  selector: 'rocket-structure-fields',
  imports: [
    ...HlmBadgeImports,
    ...HlmInputImports,
    ...HlmLabelImports,
    ...HlmSwitchImports,
    ...HlmTextareaImports,
    ...HlmTooltipImports,
    ReactiveFormsModule,
    NgIcon,
    TagsInputComponent,
    TypePipe,
  ],
  providers: [provideIcons({ lucideLock })],
  templateUrl: './structure-fields.component.html',
})
export class StructureFieldsComponent {
  /** Form group holding one control per field. */
  group = input.required<FormGroup>();

  /** Structure of the product to show. */
  structure = input.required<CoreStructureField[]>();

  /** Prefix of the field ids, to keep them unique when the fields repeat in a page. */
  idPrefix = input<string>('');

  /** Whether the form can be edited at all. */
  editable = input<boolean>(true);

  /** Whether the record already exists: its generated fields show and the not modifiable ones lock. */
  existing = input<boolean>(false);

  /** Fields to show: the generated ones only on an existing record. */
  readonly fields = computed(() => this.structure().filter(field => !field.generated || this.existing()));

  /**
   * Tells whether a field takes input.
   * @param field the field.
   * @returns true when the form is editable and the field is not locked.
   */
  isFieldEditable(field: CoreStructureField): boolean {
    return this.editable() && !this.isFieldLocked(field);
  }

  /**
   * Tells whether a field is locked because marked not modifiable on an existing record.
   * @param field the field.
   * @returns true when the field is locked.
   */
  isFieldLocked(field: CoreStructureField): boolean {
    return !!field.notModifiable && this.existing();
  }
}
