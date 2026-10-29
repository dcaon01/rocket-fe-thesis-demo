import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCopy, lucideExternalLink, lucideLink } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmItemImports } from '@spartan-ng/helm/item';
import { CoreResponseResellerContractDto, CoreStripeAccountLink } from '../../../../../../../libs/api/src';
import { Capability } from '../../../../enums/capability.enum';
import { ResellerContractsApiService } from '../../../../services/api-services/reseller-contracts/reseller-contracts-api.service';
import { ProductsCacheService } from '../../../../services/cache/products-cache.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { ToasterService } from '../../../../services/toaster/toaster.service';
import { openInNewTab } from '../../../../utils/open-in-new-tab.util';

/**
 * SEPA mandates of a reseller contract, one per product the contract enables: the month's charges of each product are
 * debited there. A mandate belongs to the contract and ends with it.
 * Usage: <rocket-reseller-contract-mandates [contract]="contract" />
 */
@Component({
  selector: 'rocket-reseller-contract-mandates',
  imports: [
    ...HlmButtonImports,
    ...HlmItemImports,
    DatePipe,
    NgIcon,
  ],
  providers: [
    provideIcons({
      lucideCopy,
      lucideExternalLink,
      lucideLink,
    })
  ],
  templateUrl: './reseller-contract-mandates.component.html',
})
export class ResellerContractMandatesComponent {
  /** Reseller contracts API service instance. */
  private readonly _resellerContractsApiService = inject(ResellerContractsApiService);

  /** Products cache service instance. */
  private readonly _productsCacheService = inject(ProductsCacheService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Toaster service instance. */
  private readonly _toasterService = inject(ToasterService);

  /** Contract the mandates belong to. */
  contract = input.required<CoreResponseResellerContractDto>();

  /** Links to the Stripe accounts, refreshed after a checkout is generated. */
  private readonly _links = signal<CoreStripeAccountLink[]>([]);

  /** Whether the user can generate the mandate checkouts. */
  readonly canCollect = computed(() => this._permissions.can(Capability.CollectMandates));

  /** Products the contract enables, each with its link. */
  readonly accounts = computed(() => this.contract().productIds.map(productId => ({
    productId,
    name: this._productsCacheService.products().find(product => product.id === productId)?.name ?? productId,
    link: this._links().find(link => link.accountKey === productId),
  })));

  /**
   * Constructor that follows the links of the contract.
   */
  constructor() {
    // Keep the links in step with the contract.
    effect(() => this._links.set(this.contract().stripeAccounts ?? []));
  }

  /**
   * Tells whether the checkout of a link is still valid.
   * @param link the link to the account.
   * @returns true when the link has an unexpired checkout.
   */
  hasValidCheckout(link: CoreStripeAccountLink | undefined): boolean {
    return !!link?.checkoutSessionUrl && !!link.checkoutSessionExpiresAt && new Date(link.checkoutSessionExpiresAt) > new Date();
  }

  /**
   * Generates the checkout of the mandate on the account of a product.
   * @param productId the product whose account collects.
   */
  generateCheckout(productId: string): void {
    const { resellerId, id } = this.contract();
    this._resellerContractsApiService.createMandateCheckout(resellerId, id, productId).subscribe({
      next: (contract) => this._links.set(contract.stripeAccounts ?? []),
      error: (error) => console.error('Error generating the mandate checkout:', error)
    });
  }

  /**
   * Copies the checkout link, to send it to the reseller.
   * @param link the link to the account.
   */
  copyCheckoutLink(link: CoreStripeAccountLink): void {
    if (!link.checkoutSessionUrl) return;
    navigator.clipboard.writeText(link.checkoutSessionUrl);
    this._toasterService.showSuccess('Link al pagamento copiato');
  }

  /**
   * Opens the checkout link, to fill it in on behalf of the reseller.
   * @param link the link to the account.
   */
  openCheckoutLink(link: CoreStripeAccountLink): void {
    if (link.checkoutSessionUrl) openInNewTab(link.checkoutSessionUrl);
  }
}
