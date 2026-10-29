import { Component, input } from '@angular/core';
import { FormSteps } from '../../utils/form-steps.util';
import { StepArrowsComponent } from '../step-arrows/step-arrows.component';

/**
 * Buttons of a long form in the page header. Creating, the chevrons, with the confirm button in place of the forward
 * one on the last section; editing, only the actions of the page, the sections picked freely from the sidebar.
 * Usage: <rocket-page-header …><rocket-form-toolbar [steps]="form.steps"><button hlmBtn>Salva</button></rocket-form-toolbar></rocket-page-header>
 */
@Component({
  selector: 'rocket-form-toolbar',
  imports: [StepArrowsComponent],
  templateUrl: './form-toolbar.component.html',
})
export class FormToolbarComponent {
  /** Sections the chevrons move through. */
  steps = input.required<FormSteps>();
}
