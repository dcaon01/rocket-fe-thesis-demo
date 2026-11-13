import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEuro, lucideReceiptEuro } from '@ng-icons/lucide';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmCard } from '@spartan-ng/helm/card';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import type { EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import { CoreResponseRevenueDashboardMetricsRecordDto } from '../../../../../../../libs/api/src';
import { ProductsCacheService } from '../../../../services/cache/products-cache.service';
import { RevenueCacheService } from '../../../../services/cache/revenue-cache.service';
import { ChartTheme, readChartTheme } from '../../../../utils/chart-theme.util';
import { Period } from '../../enums/period.enum';
import { CardItem } from '../../interfaces/card-item.interface';
import { animateCards, buildLineOption, buildPieOption, formatChartEuro, formatMonthIndex, VAT_RATE_PERCENT } from '../../utils/dashboard-charts.util';
import { KpiSkeletonsComponent } from '../../../../components/kpi-skeletons/kpi-skeletons.component';

/** Key of the fees of the resellers in the revenue records, in place of a product: the backend writes it. */
const RESELLER_FEES_KEY = 'RESELLER_FEES';

/**
 * Fatturato section of a dashboard: gross and net revenue of the month or of the year, its trend and its split by
 * product, in the perimeter of the user. With a product, only that product and without the split.
 */
@Component({
  selector: 'rocket-revenue-section',
  imports: [
    ...BrnSelectImports,
    ...HlmSelectImports,
    ...HlmSkeletonImports,
    HlmCard,
    KpiSkeletonsComponent,
    NgIcon,
    NgxEchartsDirective,
  ],
  viewProviders: [provideIcons({ lucideEuro, lucideReceiptEuro })],
  templateUrl: './revenue-section.component.html',
})
export class RevenueSectionComponent {
  /** Revenue cache service instance. */
  private readonly _revenueCacheService = inject(RevenueCacheService);

  /** Products cache service instance, for the names of the products. */
  private readonly _productsCacheService = inject(ProductsCacheService);

  /** Product whose revenue is shown, null for every product. */
  productId = input<string | null>(null);

  /** Chart colors, read from the CSS tokens. */
  private _chart: ChartTheme = readChartTheme();

  /** Revenue cards data. */
  revenueCards: CardItem[] = [];

  /** Revenue cards animated display values. */
  revenueDisplayValues: string[] = [];

  /** ECharts option for the revenue trend line chart. */
  revenueLineOption: EChartsOption | null = null;

  /** ECharts option for the revenue composition pie chart. */
  compositionPieOption: EChartsOption | null = null;

  /** Time mode of the section. */
  revenueTime = signal<Period>(Period.Monthly);

  /** Whether the figures of the current selection are still loading, so the placeholders show. */
  isLoading = signal<boolean>(true);

  /**
   * Constructor of the component.
   */
  constructor() {
    // Read the revenue again when the product change.
    effect(() => {
      const productId = this.productId();

      untracked(() => {
        this._chart = readChartTheme();
        this._load(productId);
      });
    });
  }

  /**
   * Handles the time selector change and reads the revenue of the new mode.
   * @param value the selected time mode ('MONTHLY' or 'ANNUAL').
   */
  onRevenueTimeChange(value: string): void {
    this.revenueTime.set(value as Period);
    this._load(this.productId());
  }

  /**
   * Reads the revenue of the current time mode, through the cache, and builds cards and charts from it.
   * @param productId the product whose revenue is shown, null for every product.
   */
  private _load(productId: string | null): void {
    const period = this.revenueTime();
    const isMonthly = period === Period.Monthly;

    // A late answer for another product or period must not overwrite the current one.
    const isCurrent = (): boolean => productId === this.productId() && period === this.revenueTime();
    this.isLoading.set(true);

    this._revenueCacheService.refreshRevenueMetrics(period, records => {
      if (!isCurrent()) return;

      this._process(productId ? records.filter(record => record.productId === productId) : records, isMonthly);
      this.isLoading.set(false);
    }, isMonthly ? 12 : 5, () => {
      if (isCurrent()) this.isLoading.set(false);
    });
  }

  /**
   * Processes raw revenue records into cards, pie chart composition and line chart data.
   * @param records the raw revenue records from the API.
   * @param isMonthly true for monthly period, false for annual.
   */
  private _process(records: CoreResponseRevenueDashboardMetricsRecordDto[], isMonthly: boolean): void {
    const productNameMap = new Map([
      ...this._productsCacheService.products().map(product => [product.id, product.name] as const),
      [RESELLER_FEES_KEY, 'Canoni rivenditori'] as const,
    ]);
    const label = isMonthly ? '' : ' ultimo anno';
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const cardRecords = isMonthly
      ? records.filter(record => record.monthIndex === currentMonthKey)
      : records.filter(record => record.monthIndex.startsWith(String(now.getFullYear())));

    const totalNetto = cardRecords.reduce((sum, record) => sum + record.revenue, 0) / 100;
    const totalLordo = totalNetto * (1 + VAT_RATE_PERCENT / 100);
    this.revenueCards = [
      { name: `Fatturato lordo${label} (IVA incl.)`, value: totalLordo, prefix: '€ ', decimals: 2, icon: 'lucideReceiptEuro' },
      { name: `Fatturato netto${label}`, value: totalNetto, prefix: '€ ', decimals: 2, icon: 'lucideEuro' }
    ];

    const revenueByProduct = new Map<string, number>();
    for (const record of cardRecords) {
      const name = productNameMap.get(record.productId) ?? record.productId;
      revenueByProduct.set(name, (revenueByProduct.get(name) ?? 0) + record.revenue / 100);
    }
    this.compositionPieOption = buildPieOption(this._chart, Array.from(revenueByProduct, ([name, value]) => ({ name, value })));

    const revenueByKey = new Map<string, number>();
    for (const record of records) {
      const key = isMonthly ? record.monthIndex : record.monthIndex.split('-')[0];
      revenueByKey.set(key, (revenueByKey.get(key) ?? 0) + record.revenue / 100);
    }
    const sortedKeys = Array.from(revenueByKey.keys()).sort();
    const categories = sortedKeys.map(key => isMonthly ? formatMonthIndex(key) : key);
    const values = sortedKeys.map(key => revenueByKey.get(key) ?? 0);
    this.revenueLineOption = buildLineOption(this._chart, categories, [{ name: 'Fatturato', data: values }], formatChartEuro);

    this.revenueDisplayValues = this.revenueCards.map(() => '0');
    animateCards(this.revenueCards, this.revenueDisplayValues);
  }
}
