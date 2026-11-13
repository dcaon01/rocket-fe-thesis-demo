import { Component, input } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { FormSteps, StepTab } from '../../utils/form-steps.util';

/**
 * Sections of a long form in its sidebar: a section off, for missing data or because the previous ones are still to
 * complete, carries the reason in its tooltip. It sits inside the hlm-tabs of the form, whose icons it uses.
 * Usage: <rocket-step-list [tabs]="tabs()" [steps]="steps" />
 */
@Component({
  selector: 'rocket-step-list',
  imports: [
    ...HlmTabsImports,
    ...HlmTooltipImports,
    NgIcon,
  ],
  templateUrl: './step-list.component.html',
})
export class StepListComponent {
  /** Sections of the form, the disabled ones included. */
  tabs = input.required<StepTab[]>();

  /** Navigation through the sections. */
  steps = input.required<FormSteps>();

  /** Whether a section has something left to complete, marked with a dot. */
  attention = input<(id: string) => boolean>(() => false);
}
