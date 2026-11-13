import { Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { FormSteps } from '../../utils/form-steps.util';

/**
 * Chevrons under the sections of a long form, shown when there is more than one section.
 * Usage: <rocket-step-arrows [steps]="steps" />
 */
@Component({
  selector: 'rocket-step-arrows',
  imports: [
    ...HlmButtonImports,
    ...HlmIconImports,
    ...HlmTooltipImports,
    NgIcon,
  ],
  providers: [provideIcons({ lucideChevronLeft, lucideChevronRight })],
  templateUrl: './step-arrows.component.html',
})
export class StepArrowsComponent {
  /** Sections the chevrons move through. */
  steps = input.required<FormSteps>();

  /** Whether the forward chevron is shown; off where the confirm button takes its place. */
  withNext = input<boolean>(true);
}
