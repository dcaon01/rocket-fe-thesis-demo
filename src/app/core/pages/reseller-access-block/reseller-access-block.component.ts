import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, effect, inject, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleCheck, lucideCreditCard, lucideFileX, lucideLandmark, lucideLock, lucideLogOut, lucideRefreshCw } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmItemImports } from '@spartan-ng/helm/item';
import { finalize, fromEvent, map, Observable, throttleTime } from 'rxjs';
import { CoreResellerAccessCharge, CoreResellerAccessMandate } from '../../../../../libs/api/src';
import { AuthService } from '../../../auth';
import { ResellerContractsApiService } from '../../services/api-services/reseller-contracts/reseller-contracts-api.service';
import { ResellerAccessService } from '../../services/reseller-access/reseller-access.service';
import { openInNewTab } from '../../utils/open-in-new-tab.util';

/** Shortest time between two reads of the access triggered by the tab coming back in focus. */
const FOCUS_READ_INTERVAL_MS = 5 * 1000;

/**
 * Page where the guards send the users of a reseller that cannot work in Rocket: no contract, a contract to activate,
 * an ended one, or an invoice unpaid on the fifteenth day of its dunning. Only the admin of the reseller pays and
 * gives the mandates; the state is read again whenever the tab comes back in focus, after the pages of Stripe, and
 * the page leaves for the home as soon as Rocket is unlocked.
 */
@Component({
  selector: 'rocket-reseller-access-block',
  imports: [
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmEmptyImports,
    ...HlmItemImports,
    NgIcon,
    CurrencyPipe,
    DatePipe
  ],
  providers: [
    provideIcons({
      lucideCircleCheck,
      lucideCreditCard,
      lucideFileX,
      lucideLandmark,
      lucideLock,
      lucideLogOut,
      lucideRefreshCw
    })
  ],
  templateUrl: './reseller-access-block.component.html',
  styleUrl: './reseller-access-block.component.css'
})
export class ResellerAccessBlockComponent {
  /** Reseller access service instance. */
  private readonly _accessService = inject(ResellerAccessService);

  /** Reseller contracts API service instance. */
  private readonly _resellerContractsApiService = inject(ResellerContractsApiService);

  /** Auth service instance. */
  private readonly _authService = inject(AuthService);

  /** Router instance. */
  private readonly _router = inject(Router);

  /** Access state of the reseller of the user. */
  readonly access = this._accessService.access;

  /** Title of the screen for the state. */
  readonly title = computed(() => {
    const access = this.access();
    if (!access) return 'Accesso non verificato';
    switch (access.state) {
      case 'ACTIVATING': return `Attiva il contratto ${access.contractCode ?? ''}`.trim();
      case 'SUSPENDED': return 'Rocket è bloccato';
      case 'ENDED': return 'Il contratto è terminato';
      default: return 'Ancora nessun contratto stipulato';
    }
  });

  /** Description under the title, for the state and for who reads it. */
  readonly description = computed(() => {
    const access = this.access();
    if (!access) return 'Non è stato possibile verificare il contratto del rivenditore: riprova tra poco.';
    switch (access.state) {
      case 'ACTIVATING':
        if (!access.canComplete) return 'L\'admin del rivenditore deve completare l\'attivazione del contratto.';
        return access.fee
          ? 'Paga il primo canone e dai un mandato SEPA per ogni prodotto: Rocket si sblocca appena Stripe conferma l\'ultimo passo.'
          : 'Dai un mandato SEPA per ogni prodotto: Rocket si sblocca appena Stripe conferma l\'ultimo.';
      case 'SUSPENDED':
        return access.canComplete
          ? 'Un addebito risulta ancora non pagato: Rocket si sblocca appena tutti gli addebiti sono saldati.'
          : 'Un addebito risulta ancora non pagato: l\'admin del rivenditore deve saldarlo per sbloccare Rocket.';
      case 'ENDED':
        return 'Per tornare a usare Rocket serve un nuovo contratto con Keus.';
      default:
        return 'Rocket sarà disponibile quando il contratto con Keus sarà firmato e attivato.';
    }
  });

  /** Icon of the screen for the state. */
  readonly icon = computed(() => this.access()?.state === 'ENDED' || this.access()?.state === 'NO_CONTRACT' ? 'lucideFileX' : 'lucideLock');

  /**
   * Constructor that reads the state again when the tab comes back in focus, and leaves once Rocket is unlocked.
   */
  constructor() {
    // Payments and mandates are completed on Stripe, in another tab: at most one read every few seconds.
    fromEvent(window, 'focus').pipe(throttleTime(FOCUS_READ_INTERVAL_MS), takeUntilDestroyed()).subscribe(() => this._accessService.load());

    // Go back to the home once a read finds Rocket unlocked.
    effect(() => {
      if (this._accessService.loaded() && !this._accessService.isBlocked()) {
        untracked(() => void this._router.navigateByUrl('/'));
      }
    });
  }

  /**
   * Opens the payment of the first fee, generating the link again when it expired.
   */
  payFee(): void {
    const access = this.access();
    const resellerId = this._accessService.resellerId();
    if (!access?.fee || !access.contractId || !resellerId) return;

    if (access.fee.checkoutUrl && !this.isExpired(access.fee.checkoutExpiresAt)) {
      openInNewTab(access.fee.checkoutUrl);
      return;
    }

    this._openWhenReady(this._resellerContractsApiService.refreshCheckoutSession(resellerId, access.contractId).pipe(
      map(contract => contract.checkoutSessionUrl),
    ));
  }

  /**
   * Opens the checkout that collects the mandate of a product, generating it when missing or expired.
   * @param mandate the mandate to give.
   */
  giveMandate(mandate: CoreResellerAccessMandate): void {
    const access = this.access();
    const resellerId = this._accessService.resellerId();
    if (!access?.contractId || !resellerId) return;

    if (mandate.checkoutUrl && !this.isExpired(mandate.checkoutExpiresAt)) {
      openInNewTab(mandate.checkoutUrl);
      return;
    }

    this._openWhenReady(this._resellerContractsApiService.createMandateCheckout(resellerId, access.contractId, mandate.productId).pipe(
      map(contract => contract.stripeAccounts?.find(link => link.accountKey === mandate.productId)?.checkoutSessionUrl),
    ));
  }

  /**
   * Opens the page of Stripe where an unpaid charge is paid.
   * @param charge the charge to pay.
   */
  payCharge(charge: CoreResellerAccessCharge): void {
    if (charge.payUrl) openInNewTab(charge.payUrl);
  }

  /**
   * Reads the access state again.
   */
  refresh(): void {
    this._accessService.load();
  }

  /**
   * Logs out the current user.
   */
  logout(): void {
    this._authService.logout().pipe(finalize(() => {
      window.location.reload();
    })).subscribe();
  }

  /**
   * Tells whether a checkout link expired.
   * @param expiresAt the expiration of the link (ISO).
   * @returns true when the link can no longer be opened.
   */
  isExpired(expiresAt?: string): boolean {
    return !!expiresAt && new Date(expiresAt) < new Date();
  }

  /**
   * Opens a tab within the click and points it at the link once the server returns it: after the request, the
   * browser would block a new tab.
   * @param url$ the request returning the link.
   */
  private _openWhenReady(url$: Observable<string | undefined>): void {
    const tab = window.open('', '_blank');

    // The state is read again on every outcome: a refused request often means the step is done already.
    url$.pipe(finalize(() => this._accessService.load())).subscribe({
      next: url => {
        if (!url || !tab) {
          tab?.close();
          if (url) openInNewTab(url);
          return;
        }
        tab.opener = null;
        tab.location.href = url;
      },
      error: error => {
        tab?.close();
        console.error('Error opening the checkout:', error);
      }
    });
  }
}
