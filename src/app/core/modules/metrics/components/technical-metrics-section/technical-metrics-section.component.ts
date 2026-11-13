import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideActivity, lucideBellRing, lucideBug, lucideExternalLink, lucideGauge, lucideInbox, lucideSiren, lucideTimer, lucideTimerOff, lucideTriangleAlert } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCard } from '@spartan-ng/helm/card';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import type { EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import { CoreResponseAvailabilityPeriodRecordDto, CoreResponseOpenAlertsDto, CoreResponseTechnicalErrorsIssueDto, CoreResponseTechnicalErrorsPeriodRecordDto } from '../../../../../../../libs/api/src';
import { INTEGRATIONS_ENABLED } from '../../../../constants/features';
import { UnavailableDataComponent } from '../../../../components/unavailable-data/unavailable-data.component';
import { KpiSkeletonsComponent } from '../../../../components/kpi-skeletons/kpi-skeletons.component';
import { SentryIssueLevelDirective } from '../../../../directives/sentry-issue-level.directive';
import { SentryIssueLevelPipe } from '../../../../pipes/sentry-issue-level/sentry-issue-level.pipe';
import { ProductsCacheService } from '../../../../services/cache/products-cache.service';
import { TechnicalMetricsCacheService } from '../../../../services/cache/technical-metrics-cache.service';
import { ChartTheme, readChartTheme } from '../../../../utils/chart-theme.util';
import { Period } from '../../../dashboard/enums/period.enum';
import { CardItem } from '../../../dashboard/interfaces/card-item.interface';
import { animateCards, buildLineOption, buildPieOption, formatLatency, formatMonthIndex } from '../../../dashboard/utils/dashboard-charts.util';

/** Availability of a period summed over the products in view, with the latency weighted by the calls. */
interface AvailabilityTotals {
  observedSeconds: number;
  downtimeSeconds: number;
  outages: number;
  requests: number;
  p50Weighted: number;
  p95Weighted: number;
}

/** Seconds in a minute. */
const MINUTE_SECONDS = 60;

/**
 * Technical metrics (UR-RK-225): errors and alerts from the Sentry projects, availability from the checks every 15
 * minutes and latency from API Gateway, of every product or of one. The errors come with a table of the issues of the
 * month and the link to open them on Sentry. The availability sums observed and down seconds
 * before dividing, and the latency weighs each product by its calls, so neither is a mean of means. Each block shows
 * only for the products that have its source.
 */
@Component({
  selector: 'rocket-technical-metrics-section',
  imports: [
    UnavailableDataComponent,
    ...HlmBadgeImports,
    ...HlmButtonImports,
    ...HlmEmptyImports,
    ...HlmSkeletonImports,
    ...HlmTableImports,
    HlmCard,
    DatePipe,
    KpiSkeletonsComponent,
    NgIcon,
    NgxEchartsDirective,
    SentryIssueLevelDirective,
    SentryIssueLevelPipe,
  ],
  viewProviders: [provideIcons({ lucideActivity, lucideBellRing, lucideBug, lucideExternalLink, lucideGauge, lucideInbox, lucideSiren, lucideTimer, lucideTimerOff, lucideTriangleAlert })],
  templateUrl: './technical-metrics-section.component.html',
})
export class TechnicalMetricsSectionComponent {
  /** Technical metrics cache service instance. */
  private readonly _technicalMetricsCacheService = inject(TechnicalMetricsCacheService);

  /** Products cache service instance, for the names of the products. */
  private readonly _productsCacheService = inject(ProductsCacheService);

  /** Product whose metrics are shown, null for every product. */
  productId = input<string | null>(null);

  /** Time mode of the metrics. */
  period = input<Period>(Period.Monthly);

  /** Chart colors, read from the CSS tokens. */
  private _chart: ChartTheme = readChartTheme();

  // Demo mode (INTEGRATIONS_ENABLED=false), not part of the original Rocket.
  /** Whether the figures of Sentry read live are shown: off in the demo, where they fall back. */
  readonly integrationsEnabled = INTEGRATIONS_ENABLED;

  /** Errors cards data. */
  errorsCards: CardItem[] = [];

  /** Errors cards animated display values. */
  errorsDisplayValues: string[] = [];

  /** ECharts option for the errors per period. */
  errorsLineOption: EChartsOption | null = null;

  /** ECharts option for the open alerts by product, on every product. */
  openAlertsPieOption: EChartsOption | null = null;

  /** Availability cards data. */
  availabilityCards: CardItem[] = [];

  /** Availability cards animated display values. */
  availabilityDisplayValues: string[] = [];

  /** ECharts option for the availability per period. */
  availabilityLineOption: EChartsOption | null = null;

  /** ECharts option for the latency per period, absent when no product in view has calls. */
  latencyLineOption: EChartsOption | null = null;

  /** Whether any product in view has a Sentry project, so the errors show. */
  hasErrors = signal<boolean>(false);

  /** Whether any product in view is checked, so the availability shows. */
  hasAvailability = signal<boolean>(false);

  /** Issues of the current month with most error events, on the products in view. */
  issues = signal<CoreResponseTechnicalErrorsIssueDto[]>([]);

  /** Link to the issues of the products in view on Sentry, null while unknown. */
  sentryUrl = signal<string | null>(null);

  /** Emits the link to Sentry whenever it changes, for the page to show the button next to its title. */
  readonly sentryLink = output<string | null>();

  /** Whether the issues of the current selection are still loading. */
  issuesLoading = signal<boolean>(true);

  /** Whether the last read of the issues failed, so the table tells it and the rest of the section stays. */
  issuesFailed = signal<boolean>(false);

  /** Whether the errors of the current selection are still loading, so the placeholders show. */
  errorsLoading = signal<boolean>(true);

  /** Whether the availability of the current selection is still loading, so the placeholders show. */
  availabilityLoading = signal<boolean>(true);

  /** Whether the errors have been read once, so the empty state does not flash before the answer. */
  errorsLoaded = signal<boolean>(false);

  /** Whether the availability has been read once, so the empty state does not flash before the answer. */
  availabilityLoaded = signal<boolean>(false);

  /** Names of the products by identifier. */
  readonly productNames = computed(() => new Map(this._productsCacheService.products().map(product => [product.id, product.name])));

  /**
   * Constructor of the component.
   */
  constructor() {
    effect(() => this.sentryLink.emit(this.sentryUrl()));

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
   * Reads errors, issues and availability of the period, through the cache, each on its own so a failure of Sentry
   * leaves the availability in place, and a failure of the issues leaves the charts.
   * @param productId the product whose metrics are shown, null for every product.
   * @param period the time mode.
   */
  private _load(productId: string | null, period: Period): void {
    const isMonthly = period === Period.Monthly;
    // A late answer, or a late failure, for another product or period must not touch the current one.
    const isCurrent = (): boolean => productId === this.productId() && period === this.period();
    const inView = <T extends { productId: string }>(rows: T[]): T[] => productId ? rows.filter(row => row.productId === productId) : rows;
    this.errorsLoading.set(true);
    this.availabilityLoading.set(true);

    this._technicalMetricsCacheService.refreshTechnicalErrors(period, metrics => {
      if (!isCurrent()) return;

      this._processErrors(inView(metrics.records), inView(metrics.openAlerts), productId, isMonthly);
      this.errorsLoaded.set(true);
      this.errorsLoading.set(false);
    }, isMonthly ? 12 : 5, () => {
      if (!isCurrent()) return;

      this.hasErrors.set(false);
      this.errorsLoaded.set(false);
      this.errorsLoading.set(false);
    });

    this.issuesLoading.set(true);
    this.issuesFailed.set(false);
    this._technicalMetricsCacheService.refreshTechnicalErrorsIssues(productId, data => {
      if (!isCurrent()) return;

      this.issues.set(data.issues);
      this.sentryUrl.set(data.sentryUrl ?? null);
      this.issuesLoading.set(false);
    }, () => {
      if (!isCurrent()) return;

      this.issues.set([]);
      this.sentryUrl.set(null);
      this.issuesFailed.set(true);
      this.issuesLoading.set(false);
    });

    this._technicalMetricsCacheService.refreshAvailability(period, records => {
      if (!isCurrent()) return;

      this._processAvailability(inView(records), productId, isMonthly);
      this.availabilityLoaded.set(true);
      this.availabilityLoading.set(false);
    }, isMonthly ? 12 : 5, () => {
      if (!isCurrent()) return;

      this.hasAvailability.set(false);
      this.availabilityLoaded.set(false);
      this.availabilityLoading.set(false);
    });
  }

  /**
   * Processes the errors and the open alerts into cards and charts; with no record the block shows its empty state.
   * @param records the errors records of the products in view.
   * @param openAlerts the alerts open today of the products in view.
   * @param productId the product whose metrics are shown, null for every product.
   * @param isMonthly true for monthly period, false for annual.
   */
  private _processErrors(records: CoreResponseTechnicalErrorsPeriodRecordDto[], openAlerts: CoreResponseOpenAlertsDto[], productId: string | null, isMonthly: boolean): void {
    this.hasErrors.set(records.length > 0 || openAlerts.length > 0);
    if (!this.hasErrors()) return;

    const periods = [...new Set(records.map(record => record.period))].sort();
    const current = periods[periods.length - 1];
    const ofCurrent = records.filter(record => record.period === current);
    const label = isMonthly ? ' del mese' : " dell'anno";

    this.errorsCards = [
      { name: `Errori${label}`, value: ofCurrent.reduce((sum, record) => sum + record.errors, 0), prefix: '', decimals: 0, icon: 'lucideBug' },
      { name: `Alert scattati${label}`, value: ofCurrent.reduce((sum, record) => sum + record.alertsFired, 0), prefix: '', decimals: 0, icon: 'lucideBellRing' },
      { name: 'Alert aperti', value: openAlerts.reduce((sum, alerts) => sum + alerts.openAlerts, 0), prefix: '', decimals: 0, icon: 'lucideSiren' },
    ];

    const categories = periods.map(period => isMonthly ? formatMonthIndex(period) : period);
    this.errorsLineOption = buildLineOption(this._chart, categories, this._seriesByProduct(records, periods, productId, rows => rows.reduce((sum, record) => sum + record.errors, 0)));
    this.openAlertsPieOption = productId
      ? null
      : buildPieOption(this._chart, openAlerts.filter(alerts => alerts.openAlerts > 0).map(alerts => ({ name: this._nameOf(alerts.productId), value: alerts.openAlerts })));

    this.errorsDisplayValues = this.errorsCards.map(() => '0');
    animateCards(this.errorsCards, this.errorsDisplayValues);
  }

  /**
   * Processes the availability records into cards and charts: the latency cards and chart show only when a product in
   * view had calls measured. With no record the block shows its empty state.
   * @param records the availability records of the products in view.
   * @param productId the product whose metrics are shown, null for every product.
   * @param isMonthly true for monthly period, false for annual.
   */
  private _processAvailability(records: CoreResponseAvailabilityPeriodRecordDto[], productId: string | null, isMonthly: boolean): void {
    this.hasAvailability.set(records.length > 0);
    if (records.length === 0) return;

    const periods = [...new Set(records.map(record => record.period))].sort();
    const current = this._availabilityTotals(records.filter(record => record.period === periods[periods.length - 1]));
    const label = isMonthly ? ' del mese' : " dell'anno";

    this.availabilityCards = [
      { name: `Disponibilità${label}`, value: this._availability(current), prefix: '', decimals: 2, suffix: ' %', icon: 'lucideActivity' },
      { name: `Durata dei fermi${label}`, value: Math.round(current.downtimeSeconds / MINUTE_SECONDS), prefix: '', decimals: 0, suffix: ' min', icon: 'lucideTimerOff', note: `${current.outages} ${current.outages === 1 ? 'fermo' : 'fermi'}` },
      ...(current.requests > 0 ? [
        { name: 'Latenza mediana', ...this._latencyValue(current.p50Weighted / current.requests), prefix: '', icon: 'lucideTimer' },
        { name: 'Latenza al 95° percentile', ...this._latencyValue(current.p95Weighted / current.requests), prefix: '', icon: 'lucideGauge' },
      ] : []),
    ];

    const categories = periods.map(period => isMonthly ? formatMonthIndex(period) : period);
    this.availabilityLineOption = buildLineOption(this._chart, categories, this._seriesByProduct(records, periods, productId, rows => this._availabilityOrGap(this._availabilityTotals(rows))));
    this.latencyLineOption = records.some(record => record.requests)
      ? buildLineOption(this._chart, categories, productId
        ? [
          { name: 'Mediana', data: periods.map(period => this._latency(records.filter(record => record.period === period), 'p50Weighted')) },
          { name: '95° percentile', data: periods.map(period => this._latency(records.filter(record => record.period === period), 'p95Weighted')) },
        ]
        : this._seriesByProduct(records, periods, productId, rows => this._latency(rows, 'p95Weighted')), formatLatency)
      : null;

    this.availabilityDisplayValues = this.availabilityCards.map(() => '0');
    animateCards(this.availabilityCards, this.availabilityDisplayValues);
  }

  /**
   * Builds the series of a chart: one per product on every product, a single one on one product. A period with no
   * record of the product is a gap, not a zero.
   * @param records the records in view.
   * @param periods the periods of the chart, oldest first.
   * @param productId the product whose metrics are shown, null for every product.
   * @param valueOf the value of the records of a period, null when they say nothing.
   * @returns the series.
   */
  private _seriesByProduct<T extends { productId: string; period: string }>(
    records: T[],
    periods: string[],
    productId: string | null,
    valueOf: (rows: T[]) => number | null,
  ): { name: string; data: (number | null)[] }[] {
    const productIds = productId ? [productId] : [...new Set(records.map(record => record.productId))];

    return productIds.map(id => ({
      name: this._nameOf(id),
      data: periods.map(period => {
        const rows = records.filter(record => record.productId === id && record.period === period);
        return rows.length > 0 ? valueOf(rows) : null;
      }),
    }));
  }

  /**
   * Sums the availability records of a period, weighting the latency of each product by its calls.
   * @param records the records of the period.
   * @returns the totals.
   */
  private _availabilityTotals(records: CoreResponseAvailabilityPeriodRecordDto[]): AvailabilityTotals {
    const totals: AvailabilityTotals = { observedSeconds: 0, downtimeSeconds: 0, outages: 0, requests: 0, p50Weighted: 0, p95Weighted: 0 };
    for (const record of records) {
      totals.observedSeconds += record.observedSeconds;
      totals.downtimeSeconds += record.downtimeSeconds;
      totals.outages += record.outages;
      if (record.requests && record.latencyP50Ms !== undefined && record.latencyP95Ms !== undefined) {
        totals.requests += record.requests;
        totals.p50Weighted += record.latencyP50Ms * record.requests;
        totals.p95Weighted += record.latencyP95Ms * record.requests;
      }
    }

    return totals;
  }

  /**
   * Computes the availability percentage rounded to two decimals, zero when nothing was observed.
   * @param totals the totals of a period.
   * @returns the percentage.
   */
  private _availability(totals: AvailabilityTotals): number {
    return totals.observedSeconds > 0 ? Math.round((1 - totals.downtimeSeconds / totals.observedSeconds) * 10_000) / 100 : 0;
  }

  /**
   * Computes the availability of a chart point, a gap when nothing was observed.
   * @param totals the totals of a period.
   * @returns the percentage, or null.
   */
  private _availabilityOrGap(totals: AvailabilityTotals): number | null {
    return totals.observedSeconds > 0 ? this._availability(totals) : null;
  }

  /**
   * Shapes a latency for its card, as `formatLatency` writes it: milliseconds below one second, seconds from there.
   * @param ms the latency in milliseconds.
   * @returns the value, decimals and suffix of the card.
   */
  private _latencyValue(ms: number): { value: number; decimals: number; suffix: string } {
    return ms < 1000
      ? { value: Math.round(ms), decimals: 0, suffix: ' ms' }
      : { value: ms / 1000, decimals: 1, suffix: ' s' };
  }

  /**
   * Computes a latency of some records weighted by their calls, a gap when none had calls: no traffic is not 0 ms.
   * @param records the records.
   * @param key the weighted latency to read.
   * @returns the latency in milliseconds, or null.
   */
  private _latency(records: CoreResponseAvailabilityPeriodRecordDto[], key: 'p50Weighted' | 'p95Weighted'): number | null {
    const totals = this._availabilityTotals(records);
    return totals.requests > 0 ? Math.round(totals[key] / totals.requests) : null;
  }

  /**
   * Returns the name of a product, or its identifier while the names are not loaded.
   * @param productId the identifier of the product.
   * @returns the name.
   */
  private _nameOf(productId: string): string {
    return this.productNames().get(productId) ?? productId;
  }
}
