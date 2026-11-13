import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { filter, switchMap, take } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideHandshake,
  lucideTrophy,
  lucidePercent,
  lucideTimer,
  lucideFlaskConical,
  lucideTrendingUp,
  lucideCalendarRange,
  lucideInbox,
  lucideExternalLink
} from '@ng-icons/lucide';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmCard } from '@spartan-ng/helm/card';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import { INTEGRATIONS_ENABLED } from '../../../../constants/features';
import { UnavailableDataComponent } from '../../../../components/unavailable-data/unavailable-data.component';
import { Period } from '../../../dashboard/enums/period.enum';
import { CardItem } from '../../../dashboard/interfaces/card-item.interface';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { HubspotApiService } from '../../../../services/api-services/hubspot/hubspot-api.service';
import { ProductsCacheService } from '../../../../services/cache/products-cache.service';
import { SalesCacheService } from '../../../../services/cache/sales-cache.service';
import { CoreResponseSalesDashboardMetricsDto } from '../../../../../../../libs/api/src';
import { ChartTheme, readChartTheme } from '../../../../utils/chart-theme.util';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { Capability } from '../../../../enums/capability.enum';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { SalesOrdersSectionComponent } from '../../../dashboard/components/sales-orders-section/sales-orders-section.component';
import { KpiSkeletonsComponent } from '../../../../components/kpi-skeletons/kpi-skeletons.component';
import { buildPieOption, formatChartEuro, formatChartNumber, tooltipValue } from '../../../dashboard/utils/dashboard-charts.util';

@Component({
  selector: 'rocket-sales-metrics',
  imports: [
    UnavailableDataComponent,
    ...BrnSelectImports,
    ...HlmButtonImports,
    ...HlmSelectImports,
    ...HlmEmptyImports,
    ...HlmSkeletonImports,
    HlmCard,
    KpiSkeletonsComponent,
    PageHeaderComponent,
    SalesOrdersSectionComponent,
    NgIcon,
    NgxEchartsDirective,
  ],
  viewProviders: [
    provideIcons({ lucideHandshake, lucideTrophy, lucidePercent, lucideTimer, lucideFlaskConical, lucideTrendingUp, lucideCalendarRange, lucideInbox, lucideExternalLink })
  ],
  templateUrl: './sales-metrics.component.html',
  styleUrl: './sales-metrics.component.css'
})
export class SalesMetricsComponent {
  /** Chart colors, read from the CSS tokens. */
  private _chart: ChartTheme = readChartTheme();

  /** Flag to toggle between mock data and real API data. Set to false to use cache services. */
  private readonly USE_MOCK_DATA = false;

  /** The activated route instance for reading route parameters. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** Products cache service instance for retrieving product info and its solution of interest. */
  private readonly _productsCacheService = inject(ProductsCacheService);

  /** Sales cache service instance. */
  private readonly _salesCacheService = inject(SalesCacheService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** HubSpot api service instance. */
  private readonly _hubspotApiService = inject(HubspotApiService);

  // Demo mode (INTEGRATIONS_ENABLED=false), not part of the original Rocket.
  /** Whether the figures of HubSpot are read: off in the demo, where their charts fall back. */
  readonly integrationsEnabled = INTEGRATIONS_ENABLED;

  /** Whether the user reads the HubSpot pipeline, which a Keus salesperson does not. */
  readonly canViewPipeline = computed(() => this._permissions.can(Capability.ViewSalesPipeline));

  /** Link to the products pipeline on HubSpot, absent until read or when the user cannot read the pipeline. */
  readonly hubspotUrl = signal<string | null>(null);

  /** Whether the user reads the orders, trials and provisioning from Rocket. */
  readonly canViewOrders = computed(() => this._permissions.can(Capability.ViewSalesOrders));

  /** The current product ID from the route. */
  productId = '';

  /** Period selector signal. */
  periodTime = signal<Period>(Period.Monthly);

  /** Pipeline section cards data. */
  pipelineCards: CardItem[] = [];

  /** Pipeline section animated display values. */
  pipelineDisplayValues: string[] = [];

  /** Revenue section cards data. */
  revenueCards: CardItem[] = [];

  /** Revenue section animated display values. */
  revenueDisplayValues: string[] = [];

  /** ECharts option for the deals trend multi-line chart. */
  dealsTrendOption: EChartsOption | null = null;

  /** ECharts option for the MRR/ARR revenue trend line chart. */
  revenueTrendOption: EChartsOption | null = null;

  /** ECharts option for the quarterly deals bar chart. */
  quarterlyDealsOption: EChartsOption | null = null;

  /** Whether the figures of the current selection are still loading, so the placeholders show. */
  isLoading = signal<boolean>(true);

  /** ECharts option for the outcome donut chart (won vs lost). */
  dealsOutcomeOption: EChartsOption | null = null;

  /** Whether the outcome donut has been built for the current selection, with or without closed deals. */
  outcomeLoaded = signal<boolean>(false);

  constructor() {
    // Permissions may resolve after the page: the link loads once they allow it, and stays hidden on error.
    toObservable(this.canViewPipeline).pipe(
      filter(Boolean),
      // Demo mode (INTEGRATIONS_ENABLED=false), not part of the original Rocket.
      filter(() => INTEGRATIONS_ENABLED),
      take(1),
      switchMap(() => this._hubspotApiService.getDealsPipelineLink()),
      takeUntilDestroyed(),
    ).subscribe({
      next: link => this.hubspotUrl.set(link.url),
      error: error => console.error('Error loading the HubSpot link:', error)
    });

    this.productId = this._activatedRoute.snapshot.paramMap.get('productId') || '';

    effect(() => {
      this._productsCacheService.products();
      untracked(() => {
        this._chart = readChartTheme();
        this.applyMode();
      });
    });
  }

  /**
   * Handles the period selector change.
   * Updates the period signal and reapplies the current mode.
   * @param value the selected period value ('MONTHLY' or 'ANNUAL').
   */
  onPeriodChange(value: string): void {
    this.periodTime.set(value as Period);
    this.applyMode();
  }

  /**
   * Applies the current mode (mock or API) based on the USE_MOCK_DATA flag.
   * Delegates to applyMock or applyFromCache depending on the flag.
   */
  private applyMode(): void {
    const isMonthly = this.periodTime() === Period.Monthly;

    if (this.USE_MOCK_DATA) {
      this.applyMock(isMonthly);
    } else {
      this.applyFromCache(isMonthly);
    }
  }

  /**
   * Fetches sales data for this product via the cache service and processes the records.
   * Asks only for the solution of interest of the product and keeps its records.
   * @param isMonthly true for monthly data, false for annual.
   */
  private applyFromCache(isMonthly: boolean): void {
    const period = isMonthly ? Period.Monthly : Period.Annual;
    const intervals = isMonthly ? 12 : 5;
    const solution = this._productsCacheService.products().find(p => p.id === this.productId)?.hubspotSolution;

    if (!solution || !this.canViewPipeline()) {
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.outcomeLoaded.set(false);
    this._salesCacheService.refreshSalesMetrics([solution], period, (records) => {
      this.processSalesRecords(records.filter(r => r.solution === solution), isMonthly);
      this.isLoading.set(false);
    }, intervals, () => {
      this._clearPipeline();
      this.isLoading.set(false);
    });

    // In annual mode fetch the trailing 12 months for the outcome donut.
    if (!isMonthly) {
      this._salesCacheService.refreshSalesMetrics([solution], Period.Monthly, (records) => {
        this.buildOutcomeChart(records.filter(r => r.solution === solution));
      }, 12);
    }
  }

  /**
   * Drops the figures of the HubSpot sections, so a failed read does not leave the previous selection.
   */
  private _clearPipeline(): void {
    this.pipelineCards = [];
    this.pipelineDisplayValues = [];
    this.revenueCards = [];
    this.revenueDisplayValues = [];
    this.dealsTrendOption = null;
    this.revenueTrendOption = null;
    this.quarterlyDealsOption = null;
    this.dealsOutcomeOption = null;
  }

  /**
   * Processes raw sales API records into cards, charts, and trend data.
   * Values from the API are in cents and converted to euros.
   * @param records the sales records of the product, one per period.
   * @param isMonthly true for monthly period, false for annual.
   */
  private processSalesRecords(records: CoreResponseSalesDashboardMetricsDto[], isMonthly: boolean): void {
    const sortedRecords = [...records].sort((a, b) => a.period.localeCompare(b.period));
    const current = sortedRecords.length > 0 ? sortedRecords[sortedRecords.length - 1] : null;

    this.pipelineCards = [
      { name: 'Deal creati', value: current?.dealsCreated ?? 0, prefix: '', decimals: 0, icon: 'lucideHandshake' },
      { name: 'Deal vinti', value: current?.dealsWon ?? 0, prefix: '', decimals: 0, icon: 'lucideTrophy' },
      { name: 'Win rate', value: current?.winRate ?? 0, prefix: '', decimals: 1, icon: 'lucidePercent' },
      { name: 'Età media trattativa', value: current?.averageDealAgeDays ?? 0, prefix: '', decimals: 0, icon: 'lucideTimer' }
    ];
    this.pipelineDisplayValues = this.pipelineCards.map(() => '0');
    this.animateCards(this.pipelineCards, this.pipelineDisplayValues, ['', '', '%', ' gg']);

    const recurringRevenue = isMonthly
      ? this.computeLastMonthsAverage(sortedRecords, 12)
      : (current?.closedWonRevenue ?? 0);
    this.revenueCards = [
      { name: isMonthly ? 'MRR' : 'ARR', value: recurringRevenue / 100, prefix: '€ ', decimals: 0, icon: isMonthly ? 'lucideTrendingUp' : 'lucideCalendarRange' },
      { name: 'Valore trial attivi', value: (current?.activeTrialsValue ?? 0) / 100, prefix: '€ ', decimals: 0, icon: 'lucideFlaskConical' }
    ];
    this.revenueDisplayValues = this.revenueCards.map(() => '0');
    this.animateCards(this.revenueCards, this.revenueDisplayValues);

    const categories = sortedRecords.map(r => isMonthly ? this.formatMonthIndex(r.period) : r.period);
    this.dealsTrendOption = this.buildLineOption(
      categories,
      [
        { name: 'Deal creati', data: sortedRecords.map(r => r.dealsCreated) },
        { name: 'Deal vinti', data: sortedRecords.map(r => r.dealsWon) }
      ],
      this._chart.palette
    );

    this.revenueTrendOption = this.buildLineOption(
      categories,
      [{ name: 'Valore deals vinti', data: sortedRecords.map(r => r.closedWonRevenue / 100) }],
      this._chart.palette,
      true
    );

    const currentYear = new Date().getFullYear().toString();
    const quarterTotals = new Map<string, number>();
    for (const r of records) {
      if (!r.period.startsWith(currentYear)) continue;
      for (const [q, v] of Object.entries(r.dealsWonByQuarter ?? {})) {
        quarterTotals.set(q, (quarterTotals.get(q) ?? 0) + (v as number));
      }
    }
    this.quarterlyDealsOption = this.buildBarOption(
      ['Q1', 'Q2', 'Q3', 'Q4'],
      ['Q1', 'Q2', 'Q3', 'Q4'].map(q => quarterTotals.get(q) ?? 0)
    );

    // Monthly mode: donut shows only the latest month.
    if (isMonthly) {
      const latest = sortedRecords.length > 0 ? sortedRecords[sortedRecords.length - 1].period : null;
      const latestRecords = latest ? records.filter(r => r.period === latest) : [];
      this.buildOutcomeChart(latestRecords);
    }
  }

  /**
   * Builds the outcome donut option from raw monthly records (trailing 12 months).
   * Aggregates dealsWon and the weighted winRate, then derives lost = closed - won.
   * @param monthlyRecords monthly records of the product (one per month).
   */
  private buildOutcomeChart(monthlyRecords: CoreResponseSalesDashboardMetricsDto[]): void {
    const { won, winRate } = this.computeOutcomeTotals(monthlyRecords);
    this.outcomeLoaded.set(true);
    if (winRate > 0 && won > 0) {
      const closed = won / (winRate / 100);
      const lost = Math.max(0, Math.round(closed - won));
      this.dealsOutcomeOption = buildPieOption(this._chart, [
        { name: 'Vinti', value: won },
        { name: 'Persi', value: lost }
      ]);
    } else {
      this.dealsOutcomeOption = null;
    }
  }

  /**
   * Aggregates dealsWon across all records and computes a weighted winRate
   * (won / total closed * 100).
   * @param records raw records to aggregate.
   * @returns the total won count and the weighted overall winRate.
   */
  private computeOutcomeTotals(records: CoreResponseSalesDashboardMetricsDto[]): { won: number; winRate: number } {
    let totalWon = 0;
    let totalClosed = 0;
    for (const r of records) {
      totalWon += r.dealsWon;
      if (r.winRate != null && r.winRate > 0) {
        totalClosed += r.dealsWon / (r.winRate / 100);
      }
    }
    const winRate = totalClosed > 0 ? (totalWon / totalClosed) * 100 : 0;
    return { won: totalWon, winRate };
  }

  /**
   * Computes the average of `closedWonRevenue` across the last N periods
   * (including the current/latest one). If fewer than N records exist,
   * averages across what's available.
   * @param sortedRecords the records sorted ascending by period.
   * @param count the number of most recent periods to include.
   * @returns the average closed-won revenue in cents, or 0 if no records exist.
   */
  private computeLastMonthsAverage(sortedRecords: CoreResponseSalesDashboardMetricsDto[], count: number): number {
    if (sortedRecords.length === 0) {
      return 0;
    }
    const slice = sortedRecords.slice(-count);
    const total = slice.reduce((sum, r) => sum + r.closedWonRevenue, 0);
    return total / slice.length;
  }

  /**
   * Applies mock data based on the selected time mode.
   * Calls all individual mock builders and triggers the card animations.
   * @param isMonthly true for monthly data, false for annual.
   */
  private applyMock(isMonthly: boolean): void {
    this.buildPipelineCardsMock(isMonthly);
    this.buildRevenueCardsMock(isMonthly);
    this.buildDealsTrendMock(isMonthly);
    this.buildDealsOutcomeMock(isMonthly);
    this.buildRevenueTrendMock(isMonthly);
    this.buildQuarterlyDealsMock();
  }

  /**
   * Builds mock pipeline cards (deal creati, deal vinti, win rate, età media trattativa).
   * @param isMonthly true for monthly data, false for annual.
   */
  private buildPipelineCardsMock(isMonthly: boolean): void {
    this.pipelineCards = isMonthly
      ? [
          { name: 'Deal creati', value: 12, prefix: '', decimals: 0, icon: 'lucideHandshake' },
          { name: 'Deal vinti', value: 5, prefix: '', decimals: 0, icon: 'lucideTrophy' },
          { name: 'Win rate', value: 41.7, prefix: '', decimals: 1, icon: 'lucidePercent' },
          { name: 'Età media trattativa', value: 28, prefix: '', decimals: 0, icon: 'lucideTimer' }
        ]
      : [
          { name: 'Deal creati', value: 138, prefix: '', decimals: 0, icon: 'lucideHandshake' },
          { name: 'Deal vinti', value: 54, prefix: '', decimals: 0, icon: 'lucideTrophy' },
          { name: 'Win rate', value: 39.1, prefix: '', decimals: 1, icon: 'lucidePercent' },
          { name: 'Età media trattativa', value: 30, prefix: '', decimals: 0, icon: 'lucideTimer' }
        ];

    this.pipelineDisplayValues = this.pipelineCards.map(() => '0');
    this.animateCards(this.pipelineCards, this.pipelineDisplayValues, ['', '', '%', ' gg']);
  }

  /**
   * Builds mock revenue cards (MRR, ARR, valore trial attivi).
   * @param isMonthly true for monthly data, false for annual.
   */
  private buildRevenueCardsMock(isMonthly: boolean): void {
    this.revenueCards = isMonthly
      ? [
          { name: 'MRR', value: 6800, prefix: '€ ', decimals: 0, icon: 'lucideTrendingUp' },
          { name: 'Valore trial attivi', value: 2400, prefix: '€ ', decimals: 0, icon: 'lucideFlaskConical' }
        ]
      : [
          { name: 'ARR', value: 81600, prefix: '€ ', decimals: 0, icon: 'lucideCalendarRange' },
          { name: 'Valore trial attivi', value: 11200, prefix: '€ ', decimals: 0, icon: 'lucideFlaskConical' }
        ];

    this.revenueDisplayValues = this.revenueCards.map(() => '0');
    this.animateCards(this.revenueCards, this.revenueDisplayValues);
  }

  /**
   * Builds mock deals trend ECharts option for the multi-line chart (deal creati vs deal vinti).
   * @param isMonthly true for monthly data (12 points), false for annual (5 points).
   */
  private buildDealsTrendMock(isMonthly: boolean): void {
    const labels = isMonthly ? this.getMonthLabels() : this.getYearLabels();

    this.dealsTrendOption = this.buildLineOption(
      labels,
      isMonthly
        ? [
            { name: 'Deal creati', data: [10, 11, 9, 13, 14, 12, 13, 11, 15, 10, 13, 12] },
            { name: 'Deal vinti', data: [4, 5, 3, 6, 5, 4, 6, 5, 7, 4, 5, 5] }
          ]
        : [
            { name: 'Deal creati', data: [95, 108, 120, 130, 138] },
            { name: 'Deal vinti', data: [34, 40, 45, 50, 54] }
          ],
      this._chart.palette
    );
  }

  /**
   * Builds mock outcome donut ECharts option (won vs lost).
   * @param isMonthly true for monthly data, false for annual.
   */
  private buildDealsOutcomeMock(isMonthly: boolean): void {
    this.dealsOutcomeOption = buildPieOption(this._chart, isMonthly
      ? [{ name: 'Vinti', value: 5 }, { name: 'Persi', value: 7 }]
      : [{ name: 'Vinti', value: 54 }, { name: 'Persi', value: 84 }]
    );
  }

  /**
   * Builds mock revenue trend ECharts option: MRR for monthly, ARR for annual.
   * @param isMonthly true for monthly data (12 points), false for annual (5 points).
   */
  private buildRevenueTrendMock(isMonthly: boolean): void {
    const labels = isMonthly ? this.getMonthLabels() : this.getYearLabels();

    this.revenueTrendOption = this.buildLineOption(
      labels,
      isMonthly
        ? [{ name: 'Valore deals vinti', data: [4800, 5000, 5200, 5400, 5600, 5800, 6000, 6100, 6300, 6500, 6650, 6800] }]
        : [{ name: 'Valore deals vinti', data: [38400, 49200, 60000, 70800, 81600] }],
      this._chart.palette,
      true
    );
  }

  /**
   * Builds mock quarterly deals ECharts option for the bar chart.
   * Shows deal vinti per quarter (Q1–Q4) for the current year.
   */
  private buildQuarterlyDealsMock(): void {
    this.quarterlyDealsOption = this.buildBarOption(
      ['Q1', 'Q2', 'Q3', 'Q4'],
      [12, 16, 14, 12]
    );
  }

  /**
   * Animates the card values with a count-up effect.
   * Each card value increments from 0 to its target over 1200ms (60 steps),
   * formatting the displayed value with the card's prefix, locale settings, and optional suffix.
   * @param cards the card items to animate.
   * @param displayValues the display values array to update during animation.
   * @param suffixes optional array of suffixes to append (e.g. '%', ' gg').
   */
  private animateCards(cards: CardItem[], displayValues: string[], suffixes?: string[]): void {
    const duration = 1200;
    const steps = 60;
    const interval = duration / steps;

    cards.forEach((card, index) => {
      let current = 0;
      const increment = card.value / steps;
      const suffix = suffixes?.[index] ?? '';
      const timer = setInterval(() => {
        current += increment;
        if (current >= card.value) {
          current = card.value;
          clearInterval(timer);
        }
        displayValues[index] = card.prefix + current.toLocaleString('it-IT', {
          minimumFractionDigits: card.decimals,
          maximumFractionDigits: card.decimals
        }) + suffix;
      }, interval);
    });
  }

  /**
   * Builds an ECharts line chart option.
   * @param categories the x-axis category labels.
   * @param seriesList the series data to plot.
   * @param colors the color palette for the series.
   * @param isCurrency whether to format y-axis values as currency.
   * @returns the ECharts option object.
   */
  private buildLineOption(categories: string[], seriesList: { name: string; data: number[] }[], colors: string[], isCurrency = false): EChartsOption {
    return {
      color: colors,
      tooltip: {
        ...this._chart.tooltip,
        trigger: 'axis',
        valueFormatter: tooltipValue(isCurrency ? formatChartEuro : formatChartNumber)
      },
      legend: seriesList.length > 1 ? { bottom: 0, textStyle: { color: this._chart.text } } : undefined,
      grid: { left: '3%', right: '4%', bottom: seriesList.length > 1 ? '15%' : '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: { color: this._chart.text, rotate: categories.length > 6 ? 30 : 0 },
        axisLine: { lineStyle: { color: this._chart.axisLine } }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: this._chart.text,
          formatter: isCurrency ? formatChartEuro : formatChartNumber
        },
        splitLine: { lineStyle: { color: this._chart.splitLine } }
      },
      series: seriesList.map(s => ({
        name: s.name,
        type: 'line' as const,
        data: s.data,
        smooth: true,
        lineStyle: { width: 2.5 },
        symbolSize: 6,
        areaStyle: seriesList.length === 1 ? { opacity: 0.12 } : undefined
      }))
    };
  }

  /**
   * Builds an ECharts vertical bar chart option.
   * @param categories the x-axis category labels.
   * @param values the bar values.
   * @returns the ECharts option object.
   */
  private buildBarOption(categories: string[], values: number[]): EChartsOption {
    return {
      color: this._chart.palette,
      tooltip: { ...this._chart.tooltip, trigger: 'axis', valueFormatter: tooltipValue(formatChartNumber) },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: { color: this._chart.text },
        axisLine: { lineStyle: { color: this._chart.axisLine } }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: this._chart.text, formatter: formatChartNumber },
        splitLine: { lineStyle: { color: this._chart.splitLine } }
      },
      series: [{ type: 'bar', data: values, barWidth: '50%', itemStyle: { borderRadius: [6, 6, 0, 0] } }]
    };
  }

  /**
   * Formats a period string (e.g. "2026-03") into an Italian label (e.g. "Mar 2026").
   * If the period is a year only (e.g. "2026"), returns it as-is.
   * @param period the period in YYYY-MM or YYYY format.
   * @returns the formatted label string.
   */
  private formatMonthIndex(period: string): string {
    const parts = period.split('-');
    if (parts.length === 1) {
      return parts[0];
    }
    const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
    return `${monthNames[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
  }

  /**
   * Generates an array of month labels (e.g. "Gen 2025", "Feb 2025") for the
   * last 12 months up to and including the current month.
   * @returns an array of formatted month-year strings in Italian.
   */
  private getMonthLabels(): string[] {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
    const labels: string[] = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i, 1);
      labels.push(`${monthNames[date.getMonth()]} ${date.getFullYear()}`);
    }

    return labels;
  }

  /**
   * Generates an array of year labels (e.g. "2022", "2023") for the
   * last 5 years up to and including the current year.
   * @returns an array of year strings.
   */
  private getYearLabels(): string[] {
    const currentYear = new Date().getFullYear();
    const labels: string[] = [];

    for (let i = 4; i >= 0; i--) {
      labels.push(`${currentYear - i}`);
    }

    return labels;
  }
}
