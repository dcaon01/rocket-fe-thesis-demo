import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideClipboardList, lucideClock, lucideFlaskConical, lucideHandshake, lucideHourglass, lucideKeyRound, lucideStore, lucideTrendingUp } from '@ng-icons/lucide';
import { HlmCard } from '@spartan-ng/helm/card';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import type { EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import { CoreResponseSalesOrdersDashboardMetricsDto, CoreResponseSalesOrdersPeriodRecordDto } from '../../../../../../../libs/api/src';
import { SalesCacheService } from '../../../../services/cache/sales-cache.service';
import { ChartTheme, readChartTheme } from '../../../../utils/chart-theme.util';
import { Period } from '../../enums/period.enum';
import { CardItem } from '../../interfaces/card-item.interface';
import { animateCards, buildBarOption, buildLineOption, buildPieOption, formatMonthIndex } from '../../utils/dashboard-charts.util';
import { KpiSkeletonsComponent } from '../../../../components/kpi-skeletons/kpi-skeletons.component';

/** Counts of a period summed over the sellers in view, split by channel where the section needs it. */
interface PeriodTotals {
  ordersRequested: number;
  directOrders: number;
  indirectOrders: number;
  ordersOpen: number;
  trialsClosed: number;
  trialsConverted: number;
  contractsStarted: number;
  directContracts: number;
  indirectContracts: number;
  provisionedTimed: number;
  provisioningDaysTotal: number;
}

/** Resellers shown in the ranking. */
const RANKING_SIZE = 10;

/**
 * Rocket half of the sales metrics (UR-RK-222): trials, orders and backlog, provisioning time, licenses by channel and
 * the ranking of the resellers, of every product or of one. Rates and averages sum numerators and denominators before
 * dividing. The channel split and the ranking read the current period, as the split of the global dashboard.
 */
@Component({
  selector: 'rocket-sales-orders-section',
  imports: [
    ...HlmSkeletonImports,
    HlmCard,
    KpiSkeletonsComponent,
    NgIcon,
    NgxEchartsDirective,
  ],
  viewProviders: [provideIcons({ lucideClipboardList, lucideClock, lucideFlaskConical, lucideHandshake, lucideHourglass, lucideKeyRound, lucideStore, lucideTrendingUp })],
  templateUrl: './sales-orders-section.component.html',
})
export class SalesOrdersSectionComponent {
  /** Sales cache service instance. */
  private readonly _salesCacheService = inject(SalesCacheService);

  /** Product whose metrics are shown, null for every product. */
  productId = input<string | null>(null);

  /** Time mode of the metrics. */
  period = input<Period>(Period.Monthly);

  /** Chart colors, read from the CSS tokens. */
  private _chart: ChartTheme = readChartTheme();

  /** Trials and orders cards data. */
  ordersCards: CardItem[] = [];

  /** Trials and orders cards animated display values. */
  ordersDisplayValues: string[] = [];

  /** Provisioning and licenses cards data. */
  deliveryCards: CardItem[] = [];

  /** Provisioning and licenses cards animated display values. */
  deliveryDisplayValues: string[] = [];

  /** ECharts option for the orders per channel line chart. */
  ordersLineOption: EChartsOption | null = null;

  /** ECharts option for the trial conversion rate line chart. */
  conversionLineOption: EChartsOption | null = null;

  /** ECharts option for the average provisioning time line chart. */
  provisioningLineOption: EChartsOption | null = null;

  /** ECharts option for the licenses activated by channel in the current period. */
  channelPieOption: EChartsOption | null = null;

  /** ECharts option for the resellers with the most licenses activated in the current period. */
  rankingBarOption: EChartsOption | null = null;

  /** Whether the figures of the current selection are still loading, so the placeholders show. */
  isLoading = signal<boolean>(true);

  /**
   * Constructor of the component.
   */
  constructor() {
    // Read the metrics again when the product or the period change.
    effect(() => {
      const productId = this.productId();
      const period = this.period();

      untracked(() => {
        this._chart = readChartTheme();
        this._load(productId, period);
      });
    });
  }

  /**
   * Reads the metrics of the period, through the cache, and builds cards and charts from them.
   * @param productId the product whose metrics are shown, null for every product.
   * @param period the time mode.
   */
  private _load(productId: string | null, period: Period): void {
    const isMonthly = period === Period.Monthly;
    // A late answer, or a late failure, for another product or period must not touch the current one.
    const isCurrent = (): boolean => productId === this.productId() && period === this.period();
    this.isLoading.set(true);

    this._salesCacheService.refreshSalesOrdersMetrics(period, metrics => {
      if (!isCurrent()) return;

      this._process(metrics, productId, isMonthly);
      this.isLoading.set(false);
    }, isMonthly ? 12 : 5, () => {
      if (!isCurrent()) return;

      this._clear();
      this.isLoading.set(false);
    });
  }

  /**
   * Drops every figure, so a failed read does not leave the previous selection.
   */
  private _clear(): void {
    this.ordersCards = [];
    this.ordersDisplayValues = [];
    this.deliveryCards = [];
    this.deliveryDisplayValues = [];
    this.ordersLineOption = null;
    this.conversionLineOption = null;
    this.provisioningLineOption = null;
    this.channelPieOption = null;
    this.rankingBarOption = null;
  }

  /**
   * Processes the metrics into cards and charts. On every product the records without product count an order once;
   * on one product, its records.
   * @param metrics the metrics from the API.
   * @param productId the product whose metrics are shown, null for every product.
   * @param isMonthly true for monthly period, false for annual.
   */
  private _process(metrics: CoreResponseSalesOrdersDashboardMetricsDto, productId: string | null, isMonthly: boolean): void {
    const records = metrics.records.filter(record => productId ? record.productId === productId : !record.productId);
    const activeTrials = productId ? metrics.activeTrials.filter(count => count.productId === productId) : metrics.activeTrials;

    const totals = new Map<string, PeriodTotals>();
    for (const record of records) {
      const sum = totals.get(record.period) ?? this._emptyTotals();
      sum.ordersRequested += record.ordersRequested;
      sum.ordersOpen += record.ordersOpen;
      sum.trialsClosed += record.trialsClosed;
      sum.trialsConverted += record.trialsConverted;
      sum.contractsStarted += record.contractsStarted;
      sum.provisionedTimed += record.provisionedTimed;
      sum.provisioningDaysTotal += record.provisioningDaysTotal;
      if (record.resellerCode) {
        sum.indirectOrders += record.ordersRequested;
        sum.indirectContracts += record.contractsStarted;
      } else {
        sum.directOrders += record.ordersRequested;
        sum.directContracts += record.contractsStarted;
      }
      totals.set(record.period, sum);
    }
    const periods = this._windowPeriods(isMonthly);
    const currentPeriod = periods[periods.length - 1];
    const current = totals.get(currentPeriod) ?? this._emptyTotals();
    const backlog = [...totals.values()].reduce((sum, item) => ({ requested: sum.requested + item.ordersRequested, open: sum.open + item.ordersOpen }), { requested: 0, open: 0 });
    const label = isMonthly ? ' del mese' : " dell'anno";
    const windowLabel = isMonthly ? 'degli ultimi 12 mesi' : 'degli ultimi 5 anni';
    const directTrials = activeTrials.filter(count => !count.resellerCode).reduce((sum, count) => sum + count.trials, 0);
    const indirectTrials = activeTrials.filter(count => count.resellerCode).reduce((sum, count) => sum + count.trials, 0);

    this.ordersCards = [
      { name: 'Prove attive', value: directTrials + indirectTrials, prefix: '', decimals: 0, icon: 'lucideFlaskConical', note: `Keus ${directTrials}, rivenditori ${indirectTrials}` },
      { name: `Conversione delle prove${label}`, value: this._rate(current.trialsConverted, current.trialsClosed), prefix: '', decimals: 1, suffix: ' %', icon: 'lucideHandshake', note: `${current.trialsConverted} su ${current.trialsClosed} chiuse` },
      { name: `Ordini${label}`, value: current.ordersRequested, prefix: '', decimals: 0, icon: 'lucideClipboardList', note: `Diretto ${current.directOrders}, indiretto ${current.indirectOrders}` },
      { name: 'Ordini ancora aperti', value: this._rate(backlog.open, backlog.requested), prefix: '', decimals: 1, suffix: ' %', icon: 'lucideHourglass', note: `${backlog.open} su ${backlog.requested} ${windowLabel}` },
    ];
    this.deliveryCards = [
      { name: `Tempo medio di erogazione${label}`, value: this._average(current.provisioningDaysTotal, current.provisionedTimed), prefix: '', decimals: 1, suffix: ' giorni', icon: 'lucideClock', note: `Su ${current.provisionedTimed} righe erogate` },
      { name: `Licenze attivate${label}`, value: current.contractsStarted, prefix: '', decimals: 0, icon: 'lucideKeyRound' },
      { name: 'Sul canale diretto', value: current.directContracts, prefix: '', decimals: 0, icon: 'lucideTrendingUp', note: `${this._rate(current.directContracts, current.contractsStarted).toLocaleString('it-IT')} %` },
      { name: 'Sul canale indiretto', value: current.indirectContracts, prefix: '', decimals: 0, icon: 'lucideStore', note: `${this._rate(current.indirectContracts, current.contractsStarted).toLocaleString('it-IT')} %` },
    ];

    const categories = periods.map(period => isMonthly ? formatMonthIndex(period) : period);
    const series = (pick: (sum: PeriodTotals) => number) => periods.map(period => pick(totals.get(period) ?? this._emptyTotals()));
    this.ordersLineOption = buildLineOption(this._chart, categories, [
      { name: 'Totale', data: series(sum => sum.ordersRequested) },
      { name: 'Diretto', data: series(sum => sum.directOrders) },
      { name: 'Indiretto', data: series(sum => sum.indirectOrders) },
    ]);
    this.conversionLineOption = buildLineOption(this._chart, categories, [
      { name: 'Conversione', data: series(sum => this._rate(sum.trialsConverted, sum.trialsClosed)) },
    ]);
    this.provisioningLineOption = buildLineOption(this._chart, categories, [
      { name: 'Giorni medi', data: series(sum => this._average(sum.provisioningDaysTotal, sum.provisionedTimed)) },
    ]);
    this.channelPieOption = buildPieOption(this._chart, [
      { name: 'Diretto', value: current.directContracts },
      { name: 'Indiretto', value: current.indirectContracts },
    ].filter(slice => slice.value > 0));
    this.rankingBarOption = this._ranking(records.filter(record => record.period === currentPeriod));

    this.ordersDisplayValues = this.ordersCards.map(() => '0');
    animateCards(this.ordersCards, this.ordersDisplayValues);
    this.deliveryDisplayValues = this.deliveryCards.map(() => '0');
    animateCards(this.deliveryCards, this.deliveryDisplayValues);
  }

  /**
   * Builds the bars of the resellers with the most licenses activated, the first `RANKING_SIZE`.
   * @param records the records of the current period.
   * @returns the ECharts option.
   */
  private _ranking(records: CoreResponseSalesOrdersPeriodRecordDto[]): EChartsOption {
    const byReseller = new Map<string, number>();
    for (const record of records) {
      if (record.resellerCode && record.contractsStarted > 0) {
        const name = record.resellerName ?? record.resellerCode;
        byReseller.set(name, (byReseller.get(name) ?? 0) + record.contractsStarted);
      }
    }
    const ranking = [...byReseller].sort(([, a], [, b]) => b - a).slice(0, RANKING_SIZE);

    return buildBarOption(this._chart, ranking.map(([name]) => name), ranking.map(([, value]) => value));
  }

  /**
   * Lists the periods of the window, oldest first, so a period with nothing in it still shows as zero.
   * @param isMonthly true for the last 12 months, false for the last 5 years.
   * @returns the period labels.
   */
  private _windowPeriods(isMonthly: boolean): string[] {
    const now = new Date();
    const periods: string[] = [];
    for (let back = isMonthly ? 11 : 4; back >= 0; back--) {
      periods.push(isMonthly
        ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1)).toISOString().slice(0, 7)
        : String(now.getUTCFullYear() - back));
    }
    return periods;
  }

  /**
   * Computes a percentage rounded to one decimal, zero when there is nothing to divide by.
   * @param part the numerator.
   * @param whole the denominator.
   * @returns the percentage.
   */
  private _rate(part: number, whole: number): number {
    return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;
  }

  /**
   * Computes an average rounded to one decimal, zero when there is nothing to average.
   * @param total the sum of the values.
   * @param count the number of values.
   * @returns the average.
   */
  private _average(total: number, count: number): number {
    return count > 0 ? Math.round((total / count) * 10) / 10 : 0;
  }

  /**
   * Creates the totals of a period with every count at zero.
   * @returns the empty totals.
   */
  private _emptyTotals(): PeriodTotals {
    return {
      ordersRequested: 0,
      directOrders: 0,
      indirectOrders: 0,
      ordersOpen: 0,
      trialsClosed: 0,
      trialsConverted: 0,
      contractsStarted: 0,
      directContracts: 0,
      indirectContracts: 0,
      provisionedTimed: 0,
      provisioningDaysTotal: 0,
    };
  }
}
