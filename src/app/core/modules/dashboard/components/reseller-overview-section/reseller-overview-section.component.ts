import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBadgePlus, lucideBuilding2, lucideKeyRound, lucideUserPlus } from '@ng-icons/lucide';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmCard } from '@spartan-ng/helm/card';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import type { EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import { CoreResponseResellerOverviewPeriodRecordDto } from '../../../../../../../libs/api/src';
import { ProductsCacheService } from '../../../../services/cache/products-cache.service';
import { ResellerOverviewCacheService } from '../../../../services/cache/reseller-overview-cache.service';
import { ChartTheme, readChartTheme } from '../../../../utils/chart-theme.util';
import { Period } from '../../enums/period.enum';
import { CardItem } from '../../interfaces/card-item.interface';
import { animateCards, buildLineOption, buildPieOption, formatMonthIndex } from '../../utils/dashboard-charts.util';
import { KpiSkeletonsComponent } from '../../../../components/kpi-skeletons/kpi-skeletons.component';

/**
 * Licenze e clienti section of the reseller dashboard (UR-RK-339): contracts in force and started, companies served
 * and new, with the change on the previous period, their trend and the licenses by product. A reseller salesperson
 * sees only what comes from its orders.
 */
@Component({
  selector: 'rocket-reseller-overview-section',
  imports: [
    ...BrnSelectImports,
    ...HlmSelectImports,
    ...HlmSkeletonImports,
    HlmCard,
    KpiSkeletonsComponent,
    NgIcon,
    NgxEchartsDirective,
  ],
  viewProviders: [provideIcons({ lucideKeyRound, lucideBadgePlus, lucideBuilding2, lucideUserPlus })],
  templateUrl: './reseller-overview-section.component.html',
})
export class ResellerOverviewSectionComponent {
  /** Reseller overview cache service instance. */
  private readonly _resellerOverviewCacheService = inject(ResellerOverviewCacheService);

  /** Products cache service instance, for the names of the products. */
  private readonly _productsCacheService = inject(ProductsCacheService);

  /** Reseller whose licenses and customers are shown. */
  resellerId = input.required<string>();

  /** Chart colors, read from the CSS tokens. */
  private _chart: ChartTheme = readChartTheme();

  /** Overview cards data. */
  overviewCards: CardItem[] = [];

  /** Overview cards animated display values. */
  overviewDisplayValues: string[] = [];

  /** ECharts option for the licenses and activations trend line chart. */
  overviewLineOption: EChartsOption | null = null;

  /** ECharts option for the licenses by product pie chart. */
  licensesPieOption: EChartsOption | null = null;

  /** Time mode of the section. */
  overviewTime = signal<Period>(Period.Monthly);

  /** Whether the figures of the current selection are still loading, so the placeholders show. */
  isLoading = signal<boolean>(true);

  /**
   * Constructor of the component.
   */
  constructor() {
    // Read the overview again when the reseller change.
    effect(() => {
      this.resellerId();

      untracked(() => {
        this._chart = readChartTheme();
        this._load();
      });
    });
  }

  /**
   * Handles the time selector change and reads the overview of the new mode.
   * @param value the selected time mode ('MONTHLY' or 'ANNUAL').
   */
  onOverviewTimeChange(value: string): void {
    this.overviewTime.set(value as Period);
    this._load();
  }

  /**
   * Reads the overview of the current selection, through the cache, and builds cards and charts from it.
   */
  private _load(): void {
    const resellerId = this.resellerId();
    const period = this.overviewTime();
    const isMonthly = period === Period.Monthly;

    // A late answer for another selection must not overwrite the current one.
    const isCurrent = (): boolean => resellerId === this.resellerId() && period === this.overviewTime();
    this.isLoading.set(true);

    this._resellerOverviewCacheService.refreshResellerOverviewMetrics(resellerId, period, records => {
      if (!isCurrent()) return;

      this._process(records, isMonthly);
      this.isLoading.set(false);
    }, isMonthly ? 12 : 5, () => {
      if (isCurrent()) this.isLoading.set(false);
    });
  }

  /**
   * Processes the overview records into cards, pie chart and line chart: the record without a product counts every
   * product together, so a company on two products counts once.
   * @param records the overview records from the API.
   * @param isMonthly true for monthly period, false for annual.
   */
  private _process(records: CoreResponseResellerOverviewPeriodRecordDto[], isMonthly: boolean): void {
    const keys = this._periodKeys(isMonthly);
    const current = keys[keys.length - 1];
    const previous = keys[keys.length - 2];
    const totals = new Map(records.filter(record => !record.productId).map(record => [record.period, record]));
    const now = totals.get(current);
    const before = totals.get(previous);
    const label = isMonthly ? '' : ' ultimo anno';
    const comparedTo = isMonthly ? 'sul mese precedente' : "sull'anno precedente";
    const change = (field: 'contractsStarted' | 'companiesNew'): string => {
      const delta = (now?.[field] ?? 0) - (before?.[field] ?? 0);
      return `${delta > 0 ? '+' : ''}${delta} ${comparedTo}`;
    };

    this.overviewCards = [
      { name: 'Licenze attive', value: now?.contractsInForce ?? 0, prefix: '', decimals: 0, icon: 'lucideKeyRound' },
      { name: `Nuove attivazioni${label}`, value: now?.contractsStarted ?? 0, prefix: '', decimals: 0, icon: 'lucideBadgePlus', note: change('contractsStarted') },
      { name: 'Clienti serviti', value: now?.companiesInForce ?? 0, prefix: '', decimals: 0, icon: 'lucideBuilding2' },
      { name: `Nuovi clienti${label}`, value: now?.companiesNew ?? 0, prefix: '', decimals: 0, icon: 'lucideUserPlus', note: change('companiesNew') },
    ];

    const productNameMap = new Map(this._productsCacheService.products().map(product => [product.id, product.name]));
    this.licensesPieOption = buildPieOption(this._chart, records
      .filter(record => record.productId && record.period === current && record.contractsInForce > 0)
      .map(record => ({ name: productNameMap.get(record.productId as string) ?? (record.productId as string), value: record.contractsInForce })));

    this.overviewLineOption = buildLineOption(
      this._chart,
      keys.map(key => isMonthly ? formatMonthIndex(key) : key),
      [
        { name: 'Licenze attive', data: keys.map(key => totals.get(key)?.contractsInForce ?? 0) },
        { name: 'Nuove attivazioni', data: keys.map(key => totals.get(key)?.contractsStarted ?? 0) },
      ],
    );

    this.overviewDisplayValues = this.overviewCards.map(() => '0');
    animateCards(this.overviewCards, this.overviewDisplayValues);
  }

  /**
   * Lists the months or the years of the trend, oldest first.
   * @param isMonthly true for the last twelve months, false for the last five years.
   * @returns the month indexes ('YYYY-MM') or the years.
   */
  private _periodKeys(isMonthly: boolean): string[] {
    const now = new Date();

    if (!isMonthly) {
      return Array.from({ length: 5 }, (_, index) => String(now.getFullYear() - 4 + index));
    }

    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    });
  }
}
