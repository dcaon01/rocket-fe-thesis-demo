import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideInbox, lucidePackage, lucideSend, lucideSignature } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmCard } from '@spartan-ng/helm/card';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { CoreResponseMixpanelTenantKpiDto, CoreResponseResellerOpportunityDto, CoreResponseResellerWorklistDto } from '../../../../../../../libs/api/src';
import { CustomerFollowUpReasonDirective } from '../../../../directives/customer-follow-up-reason.directive';
import { CustomerFollowUpReason } from '../../../../enums/customer-follow-up-reason.enum';
import { LeverOutcome } from '../../../../enums/lever-outcome.enum';
import { MixpanelLever } from '../../../../enums/mixpanel-lever.enum';
import { Profile } from '../../../../enums/profile.enum';
import { ResellerOpportunityReason } from '../../../../enums/reseller-opportunity-reason.enum';
import { CustomerFollowUpReasonPipe } from '../../../../pipes/customer-follow-up-reason/customer-follow-up-reason.pipe';
import { ResellerOpportunityReasonPipe } from '../../../../pipes/reseller-opportunity-reason/reseller-opportunity-reason.pipe';
import { MetricsApiService } from '../../../../services/api-services/metrics/metrics-api.service';
import { AppContextService } from '../../../../services/app-context/app-context.service';
import { ProductAdoptionCacheService } from '../../../../services/cache/product-adoption-cache.service';
import { ProductsCacheService } from '../../../../services/cache/products-cache.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { ToasterService } from '../../../../services/toaster/toaster.service';
import { CardItem } from '../../interfaces/card-item.interface';
import { animateCards } from '../../utils/dashboard-charts.util';
import { KpiSkeletonsComponent } from '../../../../components/kpi-skeletons/kpi-skeletons.component';

/** Profiles that open the record of a company in the reseller workspace, as its route allows. */
const COMPANY_PROFILES = [Profile.KeusAdmin, Profile.KeusBackoffice, Profile.ResellerOwner, Profile.ResellerBackoffice, Profile.ResellerSales];

/** Outcomes of the risk lever that put a customer at risk. */
const AT_RISK_OUTCOMES: string[] = [LeverOutcome.Failing, LeverOutcome.AtRisk];

/** A customer at risk: from the contracts of Rocket, or from the risk lever of the product metrics, with no company. */
interface RiskRow {
  /** Name of the company, or of the tenant on the product. */
  name: string;
  /** Company to open, absent on a tenant read from the product metrics. */
  companyId?: string;
  /** Product of the contract or of the tenant. */
  productId: string;
  /** Why the customer is at risk. */
  reason: CustomerFollowUpReason;
  /** Date the reason refers to, absent on the product metrics. */
  date?: string;
}

/**
 * Da fare section of the reseller dashboard (UR-RK-339), the situation of today: orders in progress, renewals of the
 * next 90 days, customers at risk and opportunities to grow. A reseller salesperson sees only what comes from its
 * orders. The risk read from Mixpanel is a read of its own, so a product metrics failure leaves the rest in place.
 */
@Component({
  selector: 'rocket-reseller-worklist-section',
  imports: [
    ...HlmBadgeImports,
    ...HlmEmptyImports,
    ...HlmTableImports,
    ...HlmSkeletonImports,
    HlmCard,
    KpiSkeletonsComponent,
    CustomerFollowUpReasonDirective,
    CustomerFollowUpReasonPipe,
    ResellerOpportunityReasonPipe,
    DatePipe,
    NgIcon,
    RouterLink,
  ],
  viewProviders: [provideIcons({ lucideInbox, lucidePackage, lucideSend, lucideSignature })],
  templateUrl: './reseller-worklist-section.component.html',
})
export class ResellerWorklistSectionComponent {
  /** Metrics API service instance. */
  private readonly _metricsApiService = inject(MetricsApiService);

  /** Product adoption cache service instance, for the outcomes of the tenants on the risk lever. */
  private readonly _adoptionCacheService = inject(ProductAdoptionCacheService);

  /** Products cache service instance, for the names of the products. */
  private readonly _productsCacheService = inject(ProductsCacheService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** App context service instance, for the links inside the workspace. */
  private readonly _context = inject(AppContextService);

  /** Toaster service instance, for the failed reads. */
  private readonly _toasterService = inject(ToasterService);

  /** Reseller whose worklist is shown. */
  resellerId = input.required<string>();

  /** Orders cards data. */
  orderCards: CardItem[] = [];

  /** Orders cards animated display values. */
  orderDisplayValues: string[] = [];

  /** Worklist of the reseller, null until read. */
  worklist = signal<CoreResponseResellerWorklistDto | null>(null);

  /** Customers at risk on the risk lever of the product metrics. */
  tenantRisks = signal<RiskRow[]>([]);

  /** Names of the products, by identifier. */
  readonly productNames = computed(() => new Map(this._productsCacheService.products().map(product => [product.id, product.name])));

  /** Customers at risk, from the contracts first and then from the product metrics. */
  readonly risks = computed<RiskRow[]>(() => [
    ...(this.worklist()?.atRisk ?? []).map(followUp => ({
      name: followUp.companyName,
      companyId: followUp.companyId,
      productId: followUp.productId,
      reason: followUp.reason as CustomerFollowUpReason,
      date: followUp.date,
    })),
    ...this.tenantRisks(),
  ]);

  /** Whether the user opens the record of a company in the workspace. */
  readonly canOpenCompanies = computed(() => this._permissions.hasAnyProfile(COMPANY_PROFILES));

  /** Whether the figures of the current selection are still loading, so the placeholders show. */
  isLoading = signal<boolean>(true);

  /**
   * Constructor of the component.
   */
  constructor() {
    // Read the worklist and the risk of the tenants again when the reseller changes.
    effect(() => {
      this.resellerId();

      untracked(() => this._load());
    });
  }

  /**
   * Builds the link to the record of a company inside the workspace.
   * @param companyId the company.
   * @returns the url of the record.
   */
  companyUrl(companyId: string): string {
    return this._context.resolveUrl(`/companies/edit/${companyId}`);
  }

  /**
   * Describes an opportunity: the seats used, or the products the company does not have yet.
   * @param opportunity the opportunity.
   * @returns the description.
   */
  opportunityDetail(opportunity: CoreResponseResellerOpportunityDto): string {
    if (opportunity.reason === ResellerOpportunityReason.SeatsNearCap) {
      return `${opportunity.activeUsers ?? 0} utenti attivi su ${opportunity.seats ?? 0} postazioni`;
    }

    const names = (opportunity.missingProductIds ?? []).map(productId => this.productNames().get(productId) ?? productId);
    return `Non ha ancora ${names.join(', ')}`;
  }

  /**
   * Reads the worklist and the outcomes of the tenants on the risk lever, from the first day of the month to today.
   */
  private _load(): void {
    const resellerId = this.resellerId();
    const today = new Date();
    const to = this._isoDay(today);
    const from = `${to.slice(0, 7)}-01`;

    this.worklist.set(null);
    this.tenantRisks.set([]);
    this.isLoading.set(true);

    // A late answer for another reseller must not overwrite the current one.
    this._metricsApiService.getResellerWorklist(resellerId).subscribe({
      next: worklist => {
        if (resellerId !== this.resellerId()) return;

        this.worklist.set(worklist);
        this._buildOrderCards(worklist);
        this.isLoading.set(false);
      },
      error: error => {
        console.error('Error loading the worklist of the reseller:', error);
        this._toasterService.showError('Non è stato possibile leggere le attività del rivenditore.');
        if (resellerId === this.resellerId()) this.isLoading.set(false);
      },
    });

    this._adoptionCacheService.refreshTenantOutcomes(from, to, undefined, rows => {
      if (resellerId !== this.resellerId()) return;

      this.tenantRisks.set(this._tenantRisksOf(rows));
    }, undefined, resellerId);
  }

  /**
   * Builds the cards of the orders in progress.
   * @param worklist the worklist of the reseller.
   */
  private _buildOrderCards(worklist: CoreResponseResellerWorklistDto): void {
    this.orderCards = [
      { name: 'Offerte in attesa del cliente', value: worklist.ordersSent, prefix: '', decimals: 0, icon: 'lucideSend' },
      { name: 'Ordini firmati da confermare', value: worklist.ordersAccepted, prefix: '', decimals: 0, icon: 'lucideSignature' },
      { name: 'Ordini da erogare', value: worklist.ordersConfirmed, prefix: '', decimals: 0, icon: 'lucidePackage' },
    ];

    this.orderDisplayValues = this.orderCards.map(() => '0');
    animateCards(this.orderCards, this.orderDisplayValues);
  }

  /**
   * Keeps the tenants whose usage is below the threshold on the risk lever of their product.
   * @param rows the outcomes of the tenants.
   * @returns the customers at risk.
   */
  private _tenantRisksOf(rows: CoreResponseMixpanelTenantKpiDto[]): RiskRow[] {
    return rows
      .filter(row => row.levers.some(result => result.lever === MixpanelLever.Risk && AT_RISK_OUTCOMES.includes(result.outcome)))
      .map(row => ({ name: row.tenantName, productId: row.productId, reason: CustomerFollowUpReason.LowUsage }));
  }

  /**
   * Formats a day as the API expects it.
   * @param date the day.
   * @returns the day (YYYY-MM-DD), in local time.
   */
  private _isoDay(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}
