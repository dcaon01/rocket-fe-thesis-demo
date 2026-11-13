import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideGem, lucideInbox, lucideRepeat, lucideRocket, lucideTriangleAlert } from '@ng-icons/lucide';
import { HlmCard } from '@spartan-ng/helm/card';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import type { EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import { CoreResponseProductAdoptionPeriodRecordDto } from '../../../../../../../libs/api/src';
import { MixpanelLever } from '../../../../enums/mixpanel-lever.enum';
import { MixpanelLeverPipe } from '../../../../pipes/mixpanel-lever/mixpanel-lever.pipe';
import { ProductAdoptionCacheService } from '../../../../services/cache/product-adoption-cache.service';
import { ChartTheme, readChartTheme } from '../../../../utils/chart-theme.util';
import { Period } from '../../enums/period.enum';
import { CardItem } from '../../interfaces/card-item.interface';
import { animateCards, buildBarOption, buildLineOption, buildStackedBarOption, formatMonthIndex, periodKeys } from '../../utils/dashboard-charts.util';
import { KpiSkeletonsComponent } from '../../../../components/kpi-skeletons/kpi-skeletons.component';

/** Counts of a lever, summed over the products and sellers in view. */
type LeverCounts = Pick<CoreResponseProductAdoptionPeriodRecordDto, 'compliant' | 'atRisk' | 'failing' | 'notAssessable' | 'observed'>;

/** A row of the outcomes table of a product: the counts of a lever. */
interface OutcomeRow extends LeverCounts {
  lever: MixpanelLever;
}

/** Outcomes in the order the chart stacks them, each with its label and the color of its state. */
const OUTCOMES: { key: keyof LeverCounts; label: string; color: keyof ChartTheme['status'] }[] = [
  { key: 'compliant', label: 'Conformi', color: 'positive' },
  { key: 'atRisk', label: 'In attenzione', color: 'warning' },
  { key: 'failing', label: 'Non conformi', color: 'negative' },
  { key: 'notAssessable', label: 'Non valutabili', color: 'neutral' },
  { key: 'observed', label: 'In osservazione', color: 'info' },
];

/** Icon of the card of each lever. */
const LEVER_ICONS: Record<MixpanelLever, string> = {
  [MixpanelLever.Activation]: 'lucideRocket',
  [MixpanelLever.Operational]: 'lucideRepeat',
  [MixpanelLever.Value]: 'lucideGem',
  [MixpanelLever.Risk]: 'lucideTriangleAlert',
};

/**
 * Product adoption metrics from Mixpanel (UR-RK-223), of every product or of one: the share of compliant tenants per
 * lever over the judged ones, the not assessable counted apart, and the risk lever as the number of failing tenants.
 */
@Component({
  selector: 'rocket-product-adoption-section',
  imports: [
    ...HlmEmptyImports,
    ...HlmTableImports,
    ...HlmSkeletonImports,
    HlmCard,
    KpiSkeletonsComponent,
    MixpanelLeverPipe,
    NgIcon,
    NgxEchartsDirective,
  ],
  viewProviders: [provideIcons({ lucideGem, lucideInbox, lucideRepeat, lucideRocket, lucideTriangleAlert })],
  templateUrl: './product-adoption-section.component.html',
})
export class ProductAdoptionSectionComponent {
  /** Product adoption cache service instance. */
  private readonly _adoptionCacheService = inject(ProductAdoptionCacheService);

  /** Product whose metrics are shown, null for every product. */
  productId = input<string | null>(null);

  /** Time mode of the metrics. */
  period = input<Period>(Period.Monthly);

  /** Chart colors, read from the CSS tokens. */
  private _chart: ChartTheme = readChartTheme();

  /** Labels of the levers, for the cards and the series. */
  private readonly _leverLabel = new MixpanelLeverPipe();

  /** Lever cards data. */
  cards: CardItem[] = [];

  /** Lever cards animated display values. */
  displayValues: string[] = [];

  /** ECharts option for the share of compliant tenants per lever. */
  shareLineOption: EChartsOption | null = null;

  /** ECharts option for the failing tenants of the risk lever. */
  riskBarOption: EChartsOption | null = null;

  /** ECharts option for the outcomes of the current period per lever, on every product. */
  outcomeBarOption: EChartsOption | null = null;

  /** Outcomes of the current period per lever, of the product in view. */
  outcomeRows = signal<OutcomeRow[]>([]);

  /** Whether any product in view has rules, so the figures show. */
  hasData = signal<boolean>(false);

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
   * Reads the adoption counts of the period, through the cache, and builds cards, charts and the outcomes table.
   * @param productId the product whose metrics are shown, null for every product.
   * @param period the time mode.
   */
  private _load(productId: string | null, period: Period): void {
    const isMonthly = period === Period.Monthly;
    // A late answer, or a late failure, for another product or period must not touch the current one.
    const isCurrent = (): boolean => productId === this.productId() && period === this.period();
    this.isLoading.set(true);

    this._adoptionCacheService.refreshAdoptionMetrics(period, records => {
      if (!isCurrent()) return;

      this._process(productId ? records.filter(record => record.productId === productId) : records, productId, isMonthly);
      this.isLoading.set(false);
    }, isMonthly ? 12 : 5, () => {
      if (!isCurrent()) return;

      this._clear();
      this.isLoading.set(false);
    });
  }

  /**
   * Drops the figures, so a failed read does not leave the previous selection.
   */
  private _clear(): void {
    this.cards = [];
    this.displayValues = [];
    this.shareLineOption = null;
    this.riskBarOption = null;
    this.outcomeBarOption = null;
    this.outcomeRows.set([]);
    this.hasData.set(false);
  }

  /**
   * Processes the records into cards, charts and the outcomes table.
   * @param records the adoption records of the products in view.
   * @param productId the product whose metrics are shown, null for every product.
   * @param isMonthly true for monthly period, false for annual.
   */
  private _process(records: CoreResponseProductAdoptionPeriodRecordDto[], productId: string | null, isMonthly: boolean): void {
    this.hasData.set(records.length > 0);
    if (records.length === 0) {
      this._clear();
      return;
    }

    const levers = Object.values(MixpanelLever).filter(lever => records.some(record => record.lever === lever));
    const periods = [...new Set(records.map(record => record.period))].sort();
    const current = periods[periods.length - 1];
    const totals = (period: string, lever: MixpanelLever): LeverCounts => records
      .filter(record => record.period === period && record.lever === lever)
      .reduce((sum, record) => ({
        compliant: sum.compliant + record.compliant,
        atRisk: sum.atRisk + record.atRisk,
        failing: sum.failing + record.failing,
        notAssessable: sum.notAssessable + record.notAssessable,
        observed: sum.observed + record.observed,
      }), { compliant: 0, atRisk: 0, failing: 0, notAssessable: 0, observed: 0 });

    this.cards = levers.map(lever => {
      const counts = totals(current, lever);
      return lever === MixpanelLever.Risk
        ? { name: 'Aziende critiche', value: counts.failing, prefix: '', decimals: 0, icon: LEVER_ICONS[lever] }
        : { name: `${this._leverLabel.transform(lever)}: aziende conformi`, value: this._share(counts), prefix: '', decimals: 1, suffix: ' %', icon: LEVER_ICONS[lever] };
    });

    // A fixed axis, as in the other sections: the periods without records stay empty, not at zero.
    const axis = periodKeys(isMonthly);
    const recorded = new Set(periods);
    const categories = axis.map(period => isMonthly ? formatMonthIndex(period) : period);
    const shareLevers = levers.filter(lever => lever !== MixpanelLever.Risk);
    this.shareLineOption = shareLevers.length > 0
      ? buildLineOption(this._chart, categories, shareLevers.map(lever => ({
        name: this._leverLabel.transform(lever),
        data: axis.map(period => recorded.has(period) ? this._share(totals(period, lever)) : null),
      })))
      : null;
    this.riskBarOption = levers.includes(MixpanelLever.Risk)
      ? buildBarOption(this._chart, categories, axis.map(period => recorded.has(period) ? totals(period, MixpanelLever.Risk).failing : null), true)
      : null;

    // Every product: one bar per lever split into its outcomes; a product: the same counts as a table.
    this.outcomeBarOption = productId
      ? null
      : buildStackedBarOption(this._chart, levers.map(lever => this._leverLabel.transform(lever)), OUTCOMES.map(outcome => ({
        name: outcome.label,
        color: this._chart.status[outcome.color],
        data: levers.map(lever => totals(current, lever)[outcome.key]),
      })));
    this.outcomeRows.set(productId ? levers.map(lever => ({ lever, ...totals(current, lever) })) : []);

    this.displayValues = this.cards.map(() => '0');
    animateCards(this.cards, this.displayValues);
  }

  /**
   * Computes the share of compliant tenants over the judged ones, in percent with one decimal: the not assessable and
   * the observed ones stay out (UR-RK-223).
   * @param counts the counts of a lever.
   * @returns the share, zero when no tenant was judged.
   */
  private _share(counts: LeverCounts): number {
    const judged = counts.compliant + counts.atRisk + counts.failing;
    return judged > 0 ? Math.round((counts.compliant / judged) * 1000) / 10 : 0;
  }
}
