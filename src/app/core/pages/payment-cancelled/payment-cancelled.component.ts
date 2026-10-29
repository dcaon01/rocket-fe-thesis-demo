import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { resellerSession } from '../../utils/reseller-session.util';

@Component({
  selector: 'rocket-payment-cancelled',
  imports: [NgIcon, RouterLink, ...HlmButtonImports, ...HlmCardImports, ...HlmEmptyImports],
  providers: [provideIcons({ lucideX })],
  templateUrl: './payment-cancelled.component.html',
})
export class PaymentCancelledComponent {
  /** Whether a reseller is logged in, the only one with an activation page to go back to. */
  readonly isReseller = resellerSession();
}
