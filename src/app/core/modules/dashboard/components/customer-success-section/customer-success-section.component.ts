import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBan, lucideCircleCheck, lucideClock, lucideInbox, lucideKeyRound, lucideLogIn, lucideMessageCircle, lucideReply, lucideTrendingDown, lucideUserMinus, lucideUserX } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmCard } from '@spartan-ng/helm/card';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import type { EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import { CoreResponseCustomerFollowUpDto, CoreResponseCustomerSuccessDashboardMetricsDto, CoreResponseSupportPeriodRecordDto } from '../../../../../../../libs/api/src';
import { CustomerFollowUpReasonDirective } from '../../../../directives/customer-follow-up-reason.directive';
import { CustomerFollowUpReason } from '../../../../enums/customer-follow-up-reason.enum';
import { CustomerFollowUpReasonPipe } from '../../../../pipes/customer-follow-up-reason/customer-follow-up-reason.pipe';
import { CustomerSuccessCacheService } from '../../../../services/cache/customer-success-cache.service';
import { ProductsCacheService } from '../../../../services/cache/products-cache.service';
import { ChartTheme, readChartTheme } from '../../../../utils/chart-theme.util';
import { Period } from '../../enums/period.enum';
import { CardItem } from '../../interfaces/card-item.interface';
import { animateCards, buildBarOption, buildLineOption, buildPieOption, formatMonthIndex } from '../../utils/dashboard-charts.util';
import { KpiSkeletonsComponent } from '../../../../components/kpi-skeletons/kpi-skeletons.component';

/** Counts of a period summed over the products and sellers in view. */
interface PeriodTotals {
  inForceAtStart: number;
  terminated: number;
  directInForce: number;
  directTerminated: number;
  indirectInForce: number;
  indirectTerminated: number;
  provisioned: number;
  activated: number;
  activationDaysTotal: number;
}

/** Seconds in an hour. */
const HOUR_SECONDS = 3600;

/** Seconds in a day. */
const DAY_SECONDS = 86_400;

/**
 * Customer success metrics (UR-RK-221): churn, activation, the customers to follow up and the support from Intercom,
 * of every product or of one. Rates and averages sum numerators and denominators before dividing, since a rate is
 * not the mean of the rates. The support shows only for the products with an Intercom brand.
 */
@Component({
  selector: 'rocket-customer-success-section',
  imports: [
    ...HlmBadgeImports,
    ...HlmEmptyImports,
    ...HlmTableImports,
    ...HlmSkeletonImports,
    HlmCard,
    KpiSkeletonsComponent,
    CustomerFollowUpReasonDirective,
    CustomerFollowUpReasonPipe,
    DatePipe,
    NgIcon,
    NgxEchartsDirective,
    RouterLink,
  ],
  viewProviders: [provideIcons({ lucideBan, lucideCircleCheck, lucideClock, lucideInbox, lucideKeyRound, lucideLogIn, lucideMessageCircle, lucideReply, lucideTrendingDown, lucideUserMinus, lucideUserX })],
  templateUrl: './customer-success-section.component.html',
})
export class CustomerSuccessSectionComponent {
  /** Customer success cache service instance. */
  private readonly _customerSuccessCacheService = inject(CustomerSuccessCacheService);

  /** Products cache service instance, for the names of the products. */
  private readonly _productsCacheService = inject(ProductsCacheService);

  /** Product whose metrics are shown, null for every product. */
  productId = input<string | null>(null);

  /** Time mode of the metrics. */
  period = input<Period>(Period.Monthly);

  /** Chart colors, read from the CSS tokens. */
  private _chart: ChartTheme = readChartTheme();

  /** Churn cards data. */
  churnCards: CardItem[] = [];

  /** Churn cards animated display values. */
  churnDisplayValues: string[] = [];

  /** Activation cards data. */
  activationCards: CardItem[] = [];

  /** Activation cards animated display values. */
  activationDisplayValues: string[] = [];

  /** ECharts option for the churn rate trend line chart. */
  churnLineOption: EChartsOption | null = null;

  /** ECharts option for the terminations split: by product on every product, by channel on one. */
  terminationsSplitOption: EChartsOption | null = null;

  /** ECharts option for the average activation time line chart. */
  activationLineOption: EChartsOption | null = null;

  /** Support cards data. */
  supportCards: CardItem[] = [];

  /** Support cards animated display values. */
  supportDisplayValues: string[] = [];

  /** ECharts option for the conversations opened and closed per period. */
  supportLineOption: EChartsOption | null = null;

  /** Whether any product in view has an Intercom brand, so the support section shows. */
  hasSupport = signal<boolean>(false);

  /** Customers to follow up, the oldest date first. */
  followUps = signal<CoreResponseCustomerFollowUpDto[]>([]);

  /** Names of the products by identifier. */
  readonly productNames = computed(() => new Map(this._productsCacheService.products().map(product => [product.id, product.name])));

  /** Records of the current period, kept to rebuild the split by product when the names arrive. */
  private _records: CoreResponseCustomerSuccessDashboardMetricsDto['records'] = [];

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

    // Rebuild the split by product when the names of the products arrive, without reading the metrics again.
    effect(() => {
      const productNames = this.productNames();

      untracked(() => {
        if (!this.productId() && this._records.length > 0) {
          this.terminationsSplitOption = this._terminationsByProduct(this._records, productNames);
        }
      });
    });
  }

  /**
   * Reads the metrics of the period, through the cache, and builds cards, charts and the follow-up list from them.
   * @param productId the product whose metrics are shown, null for every product.
   * @param period the time mode.
   */
  private _load(productId: string | null, period: Period): void {
    const isMonthly = period === Period.Monthly;
    // A late answer, or a late failure, for another product or period must not touch the current one.
    const isCurrent = (): boolean => productId === this.productId() && period === this.period();
    this.isLoading.set(true);

    this._customerSuccessCacheService.refreshCustomerSuccessMetrics(period, metrics => {
      if (!isCurrent()) return;

      this._process(metrics, productId, isMonthly);
      this.isLoading.set(false);
    }, isMonthly ? 12 : 5, () => {
      if (!isCurrent()) return;

      this._clear();
      this.isLoading.set(false);
    });

    this._customerSuccessCacheService.refreshSupportMetrics(period, records => {
      if (!isCurrent()) return;

      this._processSupport(productId ? records.filter(record => record.productId === productId) : records, isMonthly);
    }, isMonthly ? 12 : 5, () => {
      if (isCurrent()) this.hasSupport.set(false);
    });
  }

  /**
   * Drops the figures of churn, activation and follow-ups, so a failed read does not leave the previous selection.
   */
  private _clear(): void {
    this.churnCards = [];
    this.churnDisplayValues = [];
    this.activationCards = [];
    this.activationDisplayValues = [];
    this.churnLineOption = null;
    this.terminationsSplitOption = null;
    this.activationLineOption = null;
    this._records = [];
    this.followUps.set([]);
  }

  /**
   * Processes the support records into cards and the trend of the conversations; with no record the section hides.
   * @param records the support records of the products in view.
   * @param isMonthly true for monthly period, false for annual.
   */
  private _processSupport(records: CoreResponseSupportPeriodRecordDto[], isMonthly: boolean): void {
    this.hasSupport.set(records.length > 0);
    if (records.length === 0) return;

    const totals = new Map<string, CoreResponseSupportPeriodRecordDto>();
    for (const record of records) {
      const sum = totals.get(record.period) ?? { productId: '', period: record.period, opened: 0, closed: 0, firstResponseSecondsTotal: 0, firstResponseCount: 0, resolutionSecondsTotal: 0 };
      sum.opened += record.opened;
      sum.closed += record.closed;
      sum.firstResponseSecondsTotal += record.firstResponseSecondsTotal;
      sum.firstResponseCount += record.firstResponseCount;
      sum.resolutionSecondsTotal += record.resolutionSecondsTotal;
      totals.set(record.period, sum);
    }
    const periods = [...totals.keys()].sort();
    const current = totals.get(periods[periods.length - 1])!;
    const label = isMonthly ? ' del mese' : " dell'anno";

    this.supportCards = [
      { name: `Conversazioni aperte${label}`, value: current.opened, prefix: '', decimals: 0, icon: 'lucideMessageCircle' },
      { name: `Conversazioni chiuse${label}`, value: current.closed, prefix: '', decimals: 0, icon: 'lucideCircleCheck' },
      { name: 'Tempo medio di prima risposta', value: this._average(current.firstResponseSecondsTotal / HOUR_SECONDS, current.firstResponseCount), prefix: '', decimals: 1, suffix: ' ore', icon: 'lucideReply' },
      { name: 'Tempo medio di risoluzione', value: this._average(current.resolutionSecondsTotal / DAY_SECONDS, current.closed), prefix: '', decimals: 1, suffix: ' giorni', icon: 'lucideClock' },
    ];

    const categories = periods.map(period => isMonthly ? formatMonthIndex(period) : period);
    this.supportLineOption = buildLineOption(this._chart, categories, [
      { name: 'Aperte', data: periods.map(period => totals.get(period)!.opened) },
      { name: 'Chiuse', data: periods.map(period => totals.get(period)!.closed) },
    ]);

    this.supportDisplayValues = this.supportCards.map(() => '0');
    animateCards(this.supportCards, this.supportDisplayValues);
  }

  /**
   * Processes the metrics into cards, charts and the follow-up list.
   * @param metrics the metrics from the API.
   * @param productId the product whose metrics are shown, null for every product.
   * @param isMonthly true for monthly period, false for annual.
   */
  private _process(metrics: CoreResponseCustomerSuccessDashboardMetricsDto, productId: string | null, isMonthly: boolean): void {
    const records = productId ? metrics.records.filter(record => record.productId === productId) : metrics.records;
    const followUps = productId ? metrics.followUps.filter(followUp => followUp.productId === productId) : metrics.followUps;

    const totals = new Map<string, PeriodTotals>();
    for (const record of records) {
      const sum = totals.get(record.period) ?? this._emptyTotals();
      sum.inForceAtStart += record.inForceAtStart;
      sum.terminated += record.terminated;
      sum.provisioned += record.provisioned;
      sum.activated += record.activated;
      sum.activationDaysTotal += record.activationDaysTotal;
      if (record.resellerCode) {
        sum.indirectInForce += record.inForceAtStart;
        sum.indirectTerminated += record.terminated;
      } else {
        sum.directInForce += record.inForceAtStart;
        sum.directTerminated += record.terminated;
      }
      totals.set(record.period, sum);
    }
    const periods = [...totals.keys()].sort();
    const current = totals.get(periods[periods.length - 1]) ?? this._emptyTotals();
    const label = isMonthly ? ' del mese' : " dell'anno";
    const countOf = (reason: CustomerFollowUpReason) => followUps.filter(followUp => followUp.reason === reason).length;

    this.churnCards = [
      { name: `Tasso di abbandono${label}`, value: this._rate(current.terminated, current.inForceAtStart), prefix: '', decimals: 1, suffix: ' %', icon: 'lucideTrendingDown' },
      { name: `Contratti cessati${label}`, value: current.terminated, prefix: '', decimals: 0, icon: 'lucideUserMinus' },
      { name: 'Disdette in corso', value: countOf(CustomerFollowUpReason.Terminating), prefix: '', decimals: 0, icon: 'lucideClock' },
      { name: 'Accessi sospesi', value: countOf(CustomerFollowUpReason.AccessSuspended), prefix: '', decimals: 0, icon: 'lucideBan' },
    ];
    this.activationCards = [
      { name: `Credenziali consegnate${label}`, value: current.provisioned, prefix: '', decimals: 0, icon: 'lucideKeyRound' },
      { name: `Aziende attivate${label}`, value: current.activated, prefix: '', decimals: 0, icon: 'lucideLogIn' },
      { name: 'Tempo medio di attivazione', value: this._average(current.activationDaysTotal, current.activated), prefix: '', decimals: 1, suffix: ' giorni', icon: 'lucideClock' },
      { name: 'Aziende mai attivate', value: countOf(CustomerFollowUpReason.NeverActivated), prefix: '', decimals: 0, icon: 'lucideUserX' },
    ];

    const categories = periods.map(period => isMonthly ? formatMonthIndex(period) : period);
    const series = (pick: (sum: PeriodTotals) => number) => periods.map(period => pick(totals.get(period) ?? this._emptyTotals()));
    this.churnLineOption = buildLineOption(this._chart, categories, [
      { name: 'Totale', data: series(sum => this._rate(sum.terminated, sum.inForceAtStart)) },
      { name: 'Diretto', data: series(sum => this._rate(sum.directTerminated, sum.directInForce)) },
      { name: 'Indiretto', data: series(sum => this._rate(sum.indirectTerminated, sum.indirectInForce)) },
    ]);
    this.activationLineOption = buildLineOption(this._chart, categories, [
      { name: 'Giorni medi', data: series(sum => this._average(sum.activationDaysTotal, sum.activated)) },
    ]);
    // The splits count the period of the cards: the current month, or the current year.
    const currentRecords = records.filter(record => record.period === periods[periods.length - 1]);
    this.terminationsSplitOption = productId
      ? this._terminationsByChannel(currentRecords)
      : this._terminationsByProduct(currentRecords, this.productNames());

    this._records = currentRecords;
    this.followUps.set(followUps);

    this.churnDisplayValues = this.churnCards.map(() => '0');
    animateCards(this.churnCards, this.churnDisplayValues);
    this.activationDisplayValues = this.activationCards.map(() => '0');
    animateCards(this.activationCards, this.activationDisplayValues);
  }

  /**
   * Builds the pie of the terminations of the current period, by product.
   * @param records the records in view.
   * @param productNames the names of the products by identifier.
   * @returns the ECharts option.
   */
  private _terminationsByProduct(records: CoreResponseCustomerSuccessDashboardMetricsDto['records'], productNames: Map<string, string>): EChartsOption {
    const byProduct = new Map<string, number>();
    for (const record of records) {
      const name = productNames.get(record.productId) ?? record.productId;
      byProduct.set(name, (byProduct.get(name) ?? 0) + record.terminated);
    }

    return buildPieOption(this._chart, [...byProduct].filter(([, value]) => value > 0).map(([name, value]) => ({ name, value })));
  }

  /**
   * Builds the bars of the terminations of the current period by channel: the direct one, and the indirect one with
   * every reseller summed.
   * @param records the records in view.
   * @returns the ECharts option.
   */
  private _terminationsByChannel(records: CoreResponseCustomerSuccessDashboardMetricsDto['records']): EChartsOption {
    const sum = (indirect: boolean): number => records
      .filter(record => Boolean(record.resellerCode) === indirect)
      .reduce((total, record) => total + record.terminated, 0);

    return buildBarOption(this._chart, ['Diretto', 'Indiretto'], [sum(false), sum(true)]);
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
    return { inForceAtStart: 0, terminated: 0, directInForce: 0, directTerminated: 0, indirectInForce: 0, indirectTerminated: 0, provisioned: 0, activated: 0, activationDaysTotal: 0 };
  }
}
