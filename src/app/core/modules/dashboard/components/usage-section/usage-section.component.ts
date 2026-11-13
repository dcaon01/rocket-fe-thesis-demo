import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideFlaskConical, lucideLandmark, lucideScrollText, lucideUsers } from '@ng-icons/lucide';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmCard } from '@spartan-ng/helm/card';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import type { EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import { CoreResponseUtilitiesDashboardMetricsRecordDto } from '../../../../../../../libs/api/src';
import { ProductsCacheService } from '../../../../services/cache/products-cache.service';
import { UtilitiesCacheService } from '../../../../services/cache/utilities-cache.service';
import { ChartTheme, readChartTheme } from '../../../../utils/chart-theme.util';
import { Logic } from '../../enums/logic.enum';
import { Period } from '../../enums/period.enum';
import { CardItem } from '../../interfaces/card-item.interface';
import { animateCards, buildLineOption, buildPieOption, formatMonthIndex } from '../../utils/dashboard-charts.util';
import { KpiSkeletonsComponent } from '../../../../components/kpi-skeletons/kpi-skeletons.component';

/** Counters of a utilities record shown by the section. */
type UsageField = keyof Pick<CoreResponseUtilitiesDashboardMetricsRecordDto, 'users' | 'tenants' | 'trials' | 'contracts'>;

/**
 * Utenze section of a dashboard: users, tenants, trials and contracts of the month or of the year, activated or
 * active, with their trend and the users split by product. With a product, only that product and without the split;
 * with a reseller, the perimeter of that reseller.
 */
@Component({
  selector: 'rocket-usage-section',
  imports: [
    ...BrnSelectImports,
    ...HlmSelectImports,
    ...HlmSkeletonImports,
    HlmCard,
    KpiSkeletonsComponent,
    NgIcon,
    NgxEchartsDirective,
  ],
  viewProviders: [provideIcons({ lucideUsers, lucideLandmark, lucideFlaskConical, lucideScrollText })],
  templateUrl: './usage-section.component.html',
})
export class UsageSectionComponent {
  /** Utilities cache service instance. */
  private readonly _utilitiesCacheService = inject(UtilitiesCacheService);

  /** Products cache service instance, for the names of the products. */
  private readonly _productsCacheService = inject(ProductsCacheService);

  /** Product whose utilities are shown, null for every product. */
  productId = input<string | null>(null);

  /** Reseller whose utilities are shown, null for the perimeter of the user. */
  resellerId = input<string | null>(null);

  /** Chart colors, read from the CSS tokens. */
  private _chart: ChartTheme = readChartTheme();

  /** Usage cards data. */
  usageCards: CardItem[] = [];

  /** Usage cards animated display values. */
  usageDisplayValues: string[] = [];

  /** ECharts option for the users per product pie chart. */
  usagePieOption: EChartsOption | null = null;

  /** ECharts option for the usage trend multi-line chart. */
  usageTrendLineOption: EChartsOption | null = null;

  /** Time mode of the section. */
  usageTime = signal<Period>(Period.Monthly);

  /** Logic of the section: activated in the period, or active. */
  usageType = signal<Logic>(Logic.Activated);

  /** Whether the figures of the current selection are still loading, so the placeholders show. */
  isLoading = signal<boolean>(true);

  /**
   * Constructor of the component.
   */
  constructor() {
    // Read the utilities again when the product or the reseller change.
    effect(() => {
      this.productId();
      this.resellerId();

      untracked(() => {
        this._chart = readChartTheme();
        this._load();
      });
    });
  }

  /**
   * Handles the time selector change and reads the utilities of the new mode.
   * @param value the selected time mode ('MONTHLY' or 'ANNUAL').
   */
  onUsageTimeChange(value: string): void {
    this.usageTime.set(value as Period);
    this._load();
  }

  /**
   * Handles the logic selector change and reads the utilities of the new logic.
   * @param value the selected logic ('ACTIVE' or 'ACTIVATED').
   */
  onLogicChange(value: string): void {
    this.usageType.set(value as Logic);
    this._load();
  }

  /**
   * Reads the utilities of the current mode and logic, through the cache, and builds cards and charts from them.
   */
  private _load(): void {
    const period = this.usageTime();
    const logic = this.usageType();
    const productId = this.productId();
    const resellerId = this.resellerId();
    const isMonthly = period === Period.Monthly;

    // A late answer for another selection must not overwrite the current one.
    const isCurrent = (): boolean => period === this.usageTime() && logic === this.usageType() && productId === this.productId() && resellerId === this.resellerId();
    this.isLoading.set(true);

    this._utilitiesCacheService.refreshUtilitiesMetrics(period, logic, records => {
      if (!isCurrent()) return;

      this._process(productId ? records.filter(record => record.productId === productId) : records, logic === Logic.Active, isMonthly);
      this.isLoading.set(false);
    }, isMonthly ? 12 : 5, resellerId ?? undefined, () => {
      if (isCurrent()) this.isLoading.set(false);
    });
  }

  /**
   * Processes raw utilities records into cards, pie chart and line chart data.
   * @param records the utilities records of the perimeter shown.
   * @param isActive true for active entities, false for activated.
   * @param isMonthly true for monthly period, false for annual.
   */
  private _process(records: CoreResponseUtilitiesDashboardMetricsRecordDto[], isActive: boolean, isMonthly: boolean): void {
    const productNameMap = new Map(this._productsCacheService.products().map(product => [product.id, product.name]));
    const suffix = isActive ? 'attivi' : 'attivati';
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const cardRecords = isMonthly
      ? records.filter(record => record.monthIndex === currentMonthKey)
      : records.filter(record => record.monthIndex.startsWith(String(now.getFullYear())));

    const total = (field: UsageField) => cardRecords.reduce((sum, record) => sum + record[field], 0);
    this.usageCards = [
      { name: `Utenti ${suffix}`, value: total('users'), prefix: '', decimals: 0, icon: 'lucideUsers' },
      { name: `Tenant ${suffix}`, value: total('tenants'), prefix: '', decimals: 0, icon: 'lucideLandmark' },
      { name: `Trial ${suffix}`, value: total('trials'), prefix: '', decimals: 0, icon: 'lucideFlaskConical' },
      { name: `Contratti ${suffix}`, value: total('contracts'), prefix: '', decimals: 0, icon: 'lucideScrollText' }
    ];

    const usersByProduct = new Map<string, number>();
    for (const record of cardRecords) {
      const name = productNameMap.get(record.productId) ?? record.productId;
      usersByProduct.set(name, (usersByProduct.get(name) ?? 0) + record.users);
    }
    this.usagePieOption = buildPieOption(this._chart, Array.from(usersByProduct, ([name, value]) => ({ name, value })));

    const keys = Array.from(new Set(records.map(record => isMonthly ? record.monthIndex : record.monthIndex.split('-')[0]))).sort();
    const seriesOf = (field: UsageField) => keys.map(key => records
      .filter(record => (isMonthly ? record.monthIndex : record.monthIndex.split('-')[0]) === key)
      .reduce((sum, record) => sum + record[field], 0));
    this.usageTrendLineOption = buildLineOption(
      this._chart,
      keys.map(key => isMonthly ? formatMonthIndex(key) : key),
      [
        { name: 'Utenti', data: seriesOf('users') },
        { name: 'Tenant', data: seriesOf('tenants') },
        { name: 'Trial', data: seriesOf('trials') },
        { name: 'Contratti', data: seriesOf('contracts') }
      ]
    );

    this.usageDisplayValues = this.usageCards.map(() => '0');
    animateCards(this.usageCards, this.usageDisplayValues);
  }
}
