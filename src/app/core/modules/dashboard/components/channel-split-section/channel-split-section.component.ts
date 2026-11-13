import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideStore, lucideTrendingUp } from '@ng-icons/lucide';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmCard } from '@spartan-ng/helm/card';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import type { EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import { CoreResponseSalesOrdersDashboardMetricsDto } from '../../../../../../../libs/api/src';
import { SalesCacheService } from '../../../../services/cache/sales-cache.service';
import { ChartTheme, readChartTheme } from '../../../../utils/chart-theme.util';
import { Period } from '../../enums/period.enum';
import { CardItem } from '../../interfaces/card-item.interface';
import { animateCards, buildPieOption } from '../../utils/dashboard-charts.util';
import { KpiSkeletonsComponent } from '../../../../components/kpi-skeletons/kpi-skeletons.component';

/**
 * Canali section of a dashboard (UR-RK-001, UR-RK-235): the licenses activated in the month or in the year on the
 * direct and on the indirect channel, from the same records as the sales metrics. With a product, only that product.
 */
@Component({
  selector: 'rocket-channel-split-section',
  imports: [
    ...BrnSelectImports,
    ...HlmSelectImports,
    ...HlmSkeletonImports,
    HlmCard,
    KpiSkeletonsComponent,
    NgIcon,
    NgxEchartsDirective,
  ],
  viewProviders: [provideIcons({ lucideStore, lucideTrendingUp })],
  templateUrl: './channel-split-section.component.html',
})
export class ChannelSplitSectionComponent {
  /** Sales cache service instance. */
  private readonly _salesCacheService = inject(SalesCacheService);

  /** Product whose licenses are shown, null for every product. */
  productId = input<string | null>(null);

  /** Chart colors, read from the CSS tokens. */
  private _chart: ChartTheme = readChartTheme();

  /** Channel cards data. */
  channelCards: CardItem[] = [];

  /** Channel cards animated display values. */
  channelDisplayValues: string[] = [];

  /** ECharts option for the licenses activated by channel. */
  channelPieOption: EChartsOption | null = null;

  /** Time mode of the section. */
  channelTime = signal<Period>(Period.Monthly);

  /** Whether the figures of the current selection are still loading, so the placeholders show. */
  isLoading = signal<boolean>(true);

  /**
   * Constructor of the component.
   */
  constructor() {
    // Read the licenses again when the product change.
    effect(() => {
      const productId = this.productId();

      untracked(() => {
        this._chart = readChartTheme();
        this._load(productId);
      });
    });
  }

  /**
   * Handles the time selector change and reads the licenses of the new mode.
   * @param value the selected time mode ('MONTHLY' or 'ANNUAL').
   */
  onChannelTimeChange(value: string): void {
    this.channelTime.set(value as Period);
    this._load(this.productId());
  }

  /**
   * Reads the licenses of the current time mode, through the cache shared with the sales metrics.
   * @param productId the product whose licenses are shown, null for every product.
   */
  private _load(productId: string | null): void {
    const period = this.channelTime();
    const isMonthly = period === Period.Monthly;
    // A late answer, or a late failure, for another product or period must not touch the current one.
    const isCurrent = (): boolean => productId === this.productId() && period === this.channelTime();
    this.isLoading.set(true);

    this._salesCacheService.refreshSalesOrdersMetrics(period, metrics => {
      if (!isCurrent()) return;

      this._process(metrics, productId, isMonthly);
      this.isLoading.set(false);
    }, isMonthly ? 12 : 5, () => {
      if (!isCurrent()) return;

      this.channelCards = [];
      this.channelDisplayValues = [];
      this.channelPieOption = null;
      this.isLoading.set(false);
    });
  }

  /**
   * Processes the records of the current period into the two channel cards and the pie.
   * @param metrics the metrics from the API.
   * @param productId the product whose licenses are shown, null for every product.
   * @param isMonthly true for monthly period, false for annual.
   */
  private _process(metrics: CoreResponseSalesOrdersDashboardMetricsDto, productId: string | null, isMonthly: boolean): void {
    const now = new Date();
    const currentPeriod = isMonthly ? now.toISOString().slice(0, 7) : String(now.getUTCFullYear());
    const records = metrics.records.filter(record => record.period === currentPeriod && (productId ? record.productId === productId : !record.productId));

    const direct = records.filter(record => !record.resellerCode).reduce((sum, record) => sum + record.contractsStarted, 0);
    const indirect = records.filter(record => record.resellerCode).reduce((sum, record) => sum + record.contractsStarted, 0);
    const share = (part: number): string => `${(direct + indirect > 0 ? Math.round((part / (direct + indirect)) * 1000) / 10 : 0).toLocaleString('it-IT')} %`;
    const label = isMonthly ? ' del mese' : " dell'anno";

    this.channelCards = [
      { name: `Licenze attivate sul diretto${label}`, value: direct, prefix: '', decimals: 0, icon: 'lucideTrendingUp', note: share(direct) },
      { name: `Licenze attivate sull'indiretto${label}`, value: indirect, prefix: '', decimals: 0, icon: 'lucideStore', note: share(indirect) },
    ];
    this.channelPieOption = buildPieOption(this._chart, [
      { name: 'Diretto', value: direct },
      { name: 'Indiretto', value: indirect },
    ].filter(slice => slice.value > 0));

    this.channelDisplayValues = this.channelCards.map(() => '0');
    animateCards(this.channelCards, this.channelDisplayValues);
  }
}
