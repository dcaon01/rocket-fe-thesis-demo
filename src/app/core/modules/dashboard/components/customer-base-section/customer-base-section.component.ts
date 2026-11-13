import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBuilding2, lucideStore } from '@ng-icons/lucide';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmCard } from '@spartan-ng/helm/card';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import type { EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import { CoreResponseActiveCompaniesPeriodRecordDto, CoreResponseResellerNetworkEntryDto } from '../../../../../../../libs/api/src';
import { NetworkCacheService } from '../../../../services/cache/network-cache.service';
import { ProductsCacheService } from '../../../../services/cache/products-cache.service';
import { ChartTheme, readChartTheme } from '../../../../utils/chart-theme.util';
import { Period } from '../../enums/period.enum';
import { CardItem } from '../../interfaces/card-item.interface';
import { animateCards, buildLineOption, buildPieOption, formatMonthIndex } from '../../utils/dashboard-charts.util';
import { KpiSkeletonsComponent } from '../../../../components/kpi-skeletons/kpi-skeletons.component';

/**
 * Clienti section of a dashboard (UR-RK-001, UR-RK-235): the companies with at least one contract in force and the
 * resellers with the fee in force. With a product, its companies and the resellers enabled to sell it.
 */
@Component({
  selector: 'rocket-customer-base-section',
  imports: [
    ...BrnSelectImports,
    ...HlmSelectImports,
    ...HlmSkeletonImports,
    HlmCard,
    KpiSkeletonsComponent,
    NgIcon,
    NgxEchartsDirective,
  ],
  viewProviders: [provideIcons({ lucideBuilding2, lucideStore })],
  templateUrl: './customer-base-section.component.html',
})
export class CustomerBaseSectionComponent {
  /** Network cache service instance. */
  private readonly _networkCacheService = inject(NetworkCacheService);

  /** Products cache service instance. */
  private readonly _productsCacheService = inject(ProductsCacheService);

  /** Product whose customers are shown, null for every product. */
  productId = input<string | null>(null);

  /** Chart colors, read from the CSS tokens. */
  private _chart: ChartTheme = readChartTheme();

  /** Active companies of the current period, null until read. */
  private _companies: number | null = null;

  /** Active resellers today, null until read. */
  private _resellers: number | null = null;

  /** Customer base cards data. */
  customerCards: CardItem[] = [];

  /** Customer base cards animated display values. */
  customerDisplayValues: string[] = [];

  /** ECharts option for the active companies by product. */
  companiesPieOption: EChartsOption | null = null;

  /** ECharts option for the trend of the active companies. */
  companiesTrendLineOption: EChartsOption | null = null;

  /** Time mode of the section. */
  customerTime = signal<Period>(Period.Monthly);

  /** Whether the figures of the current selection are still loading, so the placeholders show. */
  isLoading = signal<boolean>(true);

  /**
   * Constructor of the component.
   */
  constructor() {
    // Read the customers again when the product change.
    effect(() => {
      const productId = this.productId();

      untracked(() => {
        this._chart = readChartTheme();
        this._load(productId);
      });
    });
  }

  /**
   * Handles the time selector change and reads the customers of the new mode.
   * @param value the selected time mode ('MONTHLY' or 'ANNUAL').
   */
  onCustomerTimeChange(value: string): void {
    this.customerTime.set(value as Period);
    this._load(this.productId());
  }

  /**
   * Reads the active companies of the current time mode and the resellers with the fee in force.
   * @param productId the product whose customers are shown, null for every product.
   */
  private _load(productId: string | null): void {
    const period = this.customerTime();
    const isMonthly = period === Period.Monthly;
    // A late answer, or a late failure, for another product or period must not touch the current one.
    const isCurrent = (): boolean => productId === this.productId() && period === this.customerTime();
    this.isLoading.set(true);

    this._networkCacheService.refreshActiveCompanies(period, records => {
      if (!isCurrent()) return;

      this._processCompanies(records, productId, isMonthly);
      this.isLoading.set(false);
    }, isMonthly ? 12 : 5, productId ?? undefined, () => {
      if (!isCurrent()) return;

      this._companies = null;
      this.companiesPieOption = null;
      this.companiesTrendLineOption = null;
      this._renderCards();
      this.isLoading.set(false);
    });

    this._networkCacheService.refreshResellerNetwork(period, entries => {
      if (!isCurrent()) return;

      this._processResellers(entries, productId);
    }, () => {
      if (!isCurrent()) return;

      this._resellers = null;
      this._renderCards();
    });
  }

  /**
   * Processes the active companies into their card, the pie by product and the trend.
   * @param records the active companies records.
   * @param productId the product whose companies are shown, null for every product.
   * @param isMonthly true for monthly period, false for annual.
   */
  private _processCompanies(records: CoreResponseActiveCompaniesPeriodRecordDto[], productId: string | null, isMonthly: boolean): void {
    const now = new Date();
    const currentPeriod = isMonthly ? now.toISOString().slice(0, 7) : String(now.getUTCFullYear());
    const shown = records.filter(record => productId ? record.productId === productId : !record.productId);

    this._companies = shown.find(record => record.period === currentPeriod)?.companiesInForce ?? 0;

    const productNames = new Map(this._productsCacheService.products().map(product => [product.id, product.name]));
    this.companiesPieOption = buildPieOption(this._chart, records
      .filter(record => record.productId && record.period === currentPeriod && record.companiesInForce > 0)
      .map(record => ({ name: productNames.get(record.productId ?? '') ?? record.productId ?? '', value: record.companiesInForce })));

    const sorted = [...shown].sort((a, b) => a.period.localeCompare(b.period));
    this.companiesTrendLineOption = buildLineOption(
      this._chart,
      sorted.map(record => isMonthly ? formatMonthIndex(record.period) : record.period),
      [{ name: 'Aziende attive', data: sorted.map(record => record.companiesInForce) }],
    );

    this._renderCards();
  }

  /**
   * Counts the resellers with the fee in force, on the product when one is shown.
   * @param entries the reseller network.
   * @param productId the product whose resellers are counted, null for every product.
   */
  private _processResellers(entries: CoreResponseResellerNetworkEntryDto[], productId: string | null): void {
    this._resellers = productId ? entries.filter(entry => entry.productIds.includes(productId)).length : entries.length;
    this._renderCards();
  }

  /**
   * Builds the cards from the figures read so far and animates them.
   */
  private _renderCards(): void {
    this.customerCards = [
      ...(this._companies !== null ? [{ name: 'Aziende attive', value: this._companies, prefix: '', decimals: 0, icon: 'lucideBuilding2' }] : []),
      ...(this._resellers !== null ? [{ name: 'Rivenditori attivi', value: this._resellers, prefix: '', decimals: 0, icon: 'lucideStore' }] : []),
    ];

    this.customerDisplayValues = this.customerCards.map(() => '0');
    animateCards(this.customerCards, this.customerDisplayValues);
  }
}
