import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { filter, switchMap, take } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideHandshake,
  lucideTrophy,
  lucidePercent,
  lucideTimer,
  lucideFlaskConical,
  lucideTrendingUp,
  lucideCalendarRange,
  lucideExternalLink
} from '@ng-icons/lucide';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmCard } from '@spartan-ng/helm/card';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import { INTEGRATIONS_ENABLED } from '../../../../constants/features';
import { UnavailableDataComponent } from '../../../../components/unavailable-data/unavailable-data.component';
import { Period } from '../../enums/period.enum';
import { CardItem } from '../../interfaces/card-item.interface';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { HubspotApiService } from '../../../../services/api-services/hubspot/hubspot-api.service';
import { ProductsCacheService } from '../../../../services/cache/products-cache.service';
import { SalesCacheService } from '../../../../services/cache/sales-cache.service';
import { CoreResponseProductDto, CoreResponseSalesDashboardMetricsDto } from '../../../../../../../libs/api/src';
import { ChartTheme, readChartTheme } from '../../../../utils/chart-theme.util';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { Capability } from '../../../../enums/capability.enum';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { SalesOrdersSectionComponent } from '../../components/sales-orders-section/sales-orders-section.component';
import { KpiSkeletonsComponent } from '../../../../components/kpi-skeletons/kpi-skeletons.component';
import { buildPieOption, formatChartEuro, formatChartNumber, tooltipValue } from '../../utils/dashboard-charts.util';

@Component({
  selector: 'rocket-global-sales-metrics',
  imports: [
    UnavailableDataComponent,
    ...BrnSelectImports,
    ...HlmButtonImports,
    ...HlmSelectImports,
    ...HlmSkeletonImports,
    HlmCard,
    KpiSkeletonsComponent,
    PageHeaderComponent,
    SalesOrdersSectionComponent,
    NgIcon,
    NgxEchartsDirective,
  ],
  viewProviders: [
    provideIcons({ lucideHandshake, lucideTrophy, lucidePercent, lucideTimer, lucideFlaskConical, lucideTrendingUp, lucideCalendarRange, lucideExternalLink })
  ],
  templateUrl: './global-sales-metrics.component.html',
  styleUrl: './global-sales-metrics.component.css'
})
export class GlobalSalesMetricsComponent {
  /** Chart colors, read from the CSS tokens. */
  private _chart: ChartTheme = readChartTheme();

  /** Flag to toggle between mock data and real API data. Set to false to use cache services. */
  private readonly USE_MOCK_DATA = false;

  /** Sales cache service instance. */
  private readonly _salesCacheService = inject(SalesCacheService);

  /** Products cache service instance for retrieving the solutions of interest of the products. */
  private readonly _productsCacheService = inject(ProductsCacheService);

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

  /** ECharts option for the deals per product pie chart. */
  dealsPerProductOption: EChartsOption | null = null;

  /** ECharts option for the MRR/ARR revenue trend line chart. */
  revenueTrendOption: EChartsOption | null = null;

  /** Whether the figures of the current selection are still loading, so the placeholders show. */
  isLoading = signal<boolean>(true);

  /** ECharts option for the quarterly deals bar chart. */
  quarterlyDealsOption: EChartsOption | null = null;

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
   * Fetches sales data via the cache service and processes the records.
   * Asks for the solutions of interest of all products, to break the won deals down by product.
   * @param isMonthly true for monthly data, false for annual.
   */
  private applyFromCache(isMonthly: boolean): void {
    if (!this.canViewPipeline()) {
      this.isLoading.set(false);
      return;
    }

    const period = isMonthly ? Period.Monthly : Period.Annual;
    const intervals = isMonthly ? 12 : 5;
    const products = this._productsCacheService.products();
    const solutions = [...new Set(products.flatMap(p => p.hubspotSolution ? [p.hubspotSolution] : []))];

    this.isLoading.set(true);
    this._salesCacheService.refreshSalesMetrics(solutions, period, (records) => {
      this.processSalesRecords(records, isMonthly, products);
      this.isLoading.set(false);
    }, intervals, () => {
      this._clearPipeline();
      this.isLoading.set(false);
    });
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
    this.dealsPerProductOption = null;
    this.revenueTrendOption = null;
    this.quarterlyDealsOption = null;
  }

  /**
   * Processes raw sales API records into cards, charts, and trend data.
   * Cards, trends and quarters read the records of the whole pipeline, so a deal with several
   * solutions counts once; the products chart reads the records of each solution.
   * Values from the API are in cents and converted to euros.
   * @param records the raw sales records from the API.
   * @param isMonthly true for monthly period, false for annual.
   * @param products the product list used to map a solution to the product name.
   */
  private processSalesRecords(records: CoreResponseSalesDashboardMetricsDto[], isMonthly: boolean, products: CoreResponseProductDto[]): void {
    const pipelineRecords = records.filter(r => !r.solution);
    const sortedRecords = [...pipelineRecords].sort((a, b) => a.period.localeCompare(b.period));
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
    for (const r of pipelineRecords) {
      if (!r.period.startsWith(currentYear)) continue;
      for (const [q, v] of Object.entries(r.dealsWonByQuarter ?? {})) {
        quarterTotals.set(q, (quarterTotals.get(q) ?? 0) + (v as number));
      }
    }
    this.quarterlyDealsOption = this.buildBarOption(
      ['Q1', 'Q2', 'Q3', 'Q4'],
      ['Q1', 'Q2', 'Q3', 'Q4'].map(q => quarterTotals.get(q) ?? 0)
    );

    const solutionToProduct = new Map<string, string>();
    for (const product of products) {
      if (product.hubspotSolution) {
        solutionToProduct.set(product.hubspotSolution, product.name);
      }
    }
    const productDeals = new Map<string, number>();
    for (const r of records) {
      const productName = r.solution ? solutionToProduct.get(r.solution) : undefined;
      if (productName) {
        productDeals.set(productName, (productDeals.get(productName) ?? 0) + r.dealsWon);
      }
    }
    this.dealsPerProductOption = buildPieOption(this._chart, 
      [...productDeals.entries()]
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value }))
    );
  }

  /**
   * Computes the average of `closedWonRevenue` across the last N periods
   * (including the current/latest one). If fewer than N records exist,
   * averages across what's available.
   * @param sortedRecords the pipeline records sorted ascending by period.
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
    this.buildDealsPerProductMock(isMonthly);
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
          { name: 'Deal creati', value: 47, prefix: '', decimals: 0, icon: 'lucideHandshake' },
          { name: 'Deal vinti', value: 18, prefix: '', decimals: 0, icon: 'lucideTrophy' },
          { name: 'Win rate', value: 38.3, prefix: '', decimals: 1, icon: 'lucidePercent' },
          { name: 'Età media trattativa', value: 32, prefix: '', decimals: 0, icon: 'lucideTimer' }
        ]
      : [
          { name: 'Deal creati', value: 524, prefix: '', decimals: 0, icon: 'lucideHandshake' },
          { name: 'Deal vinti', value: 189, prefix: '', decimals: 0, icon: 'lucideTrophy' },
          { name: 'Win rate', value: 36.1, prefix: '', decimals: 1, icon: 'lucidePercent' },
          { name: 'Età media trattativa', value: 35, prefix: '', decimals: 0, icon: 'lucideTimer' }
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
          { name: 'MRR', value: 24500, prefix: '€ ', decimals: 0, icon: 'lucideTrendingUp' },
          { name: 'Valore trial attivi', value: 8750, prefix: '€ ', decimals: 0, icon: 'lucideFlaskConical' }
        ]
      : [
          { name: 'ARR', value: 294000, prefix: '€ ', decimals: 0, icon: 'lucideCalendarRange' },
          { name: 'Valore trial attivi', value: 42300, prefix: '€ ', decimals: 0, icon: 'lucideFlaskConical' }
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
            { name: 'Deal creati', data: [38, 42, 35, 48, 52, 44, 50, 46, 55, 41, 49, 47] },
            { name: 'Deal vinti', data: [14, 16, 12, 19, 21, 17, 20, 18, 22, 15, 19, 18] }
          ]
        : [
            { name: 'Deal creati', data: [380, 420, 465, 498, 524] },
            { name: 'Deal vinti', data: [135, 152, 168, 178, 189] }
          ],
      this._chart.palette
    );
  }

  /**
   * Builds mock deals per product ECharts option for the pie chart.
   * @param isMonthly true for monthly data, false for annual.
   */
  private buildDealsPerProductMock(isMonthly: boolean): void {
    this.dealsPerProductOption = buildPieOption(this._chart, 
      isMonthly
        ? [
            { name: 'Rocket Pro', value: 8 },
            { name: 'Rocket Lite', value: 4 },
            { name: 'Rocket Enterprise', value: 3 },
            { name: 'Rocket Start', value: 2 },
            { name: 'Altro', value: 1 }
          ]
        : [
            { name: 'Rocket Pro', value: 72 },
            { name: 'Rocket Lite', value: 48 },
            { name: 'Rocket Enterprise', value: 35 },
            { name: 'Rocket Start', value: 22 },
            { name: 'Altro', value: 12 }
          ]
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
        ? [{ name: 'Valore deals vinti', data: [18200, 18900, 19500, 20100, 20800, 21400, 22000, 22600, 23100, 23500, 24000, 24500] }]
        : [{ name: 'Valore deals vinti', data: [144000, 182400, 222000, 261600, 294000] }],
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
      [42, 56, 51, 40]
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
