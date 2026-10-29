import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEuro, lucideHandCoins, lucideReceiptEuro, lucideWallet } from '@ng-icons/lucide';
import { BrnComboboxImports, comboboxContainsFilter } from '@spartan-ng/brain/combobox';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmCard } from '@spartan-ng/helm/card';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import type { EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import { catchError, map, of, switchMap } from 'rxjs';
import { CoreResponseResellerRevenueDashboardMetricsRecordDto } from '../../../../../../../libs/api/src';
import { Capability } from '../../../../enums/capability.enum';
import { Profile } from '../../../../enums/profile.enum';
import { ComboboxOption } from '../../../../interfaces/combobox-option.interface';
import { CollaboratorsApiService } from '../../../../services/api-services/collaborators/collaborators-api.service';
import { ResellersApiService } from '../../../../services/api-services/resellers/resellers-api.service';
import { ProductsCacheService } from '../../../../services/cache/products-cache.service';
import { ResellerRevenueCacheService } from '../../../../services/cache/reseller-revenue-cache.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { ChartTheme, readChartTheme } from '../../../../utils/chart-theme.util';
import { Period } from '../../enums/period.enum';
import { CardItem } from '../../interfaces/card-item.interface';
import { animateCards, buildLineOption, buildPieOption, formatChartEuro, formatMonthIndex, VAT_RATE_PERCENT } from '../../utils/dashboard-charts.util';
import { KpiSkeletonsComponent } from '../../../../components/kpi-skeletons/kpi-skeletons.component';

/** Value of the salesperson filter that reads the whole reseller. */
const ALL_SALESPEOPLE = 'ALL';

/**
 * Fatturato section of the reseller dashboard: what the reseller bills its customers in the month or in the year,
 * gross and net, what it margins, their trend and the split by product. The reseller salesperson sees only what it
 * sold, without the margin; the others may narrow everything to one salesperson.
 */
@Component({
  selector: 'rocket-reseller-revenue-section',
  imports: [
    ...BrnComboboxImports,
    ...BrnSelectImports,
    ...HlmComboboxImports,
    ...HlmSelectImports,
    ...HlmSkeletonImports,
    HlmCard,
    KpiSkeletonsComponent,
    NgIcon,
    NgxEchartsDirective,
    ReactiveFormsModule,
  ],
  viewProviders: [provideIcons({ lucideEuro, lucideReceiptEuro, lucideWallet, lucideHandCoins })],
  templateUrl: './reseller-revenue-section.component.html',
})
export class ResellerRevenueSectionComponent {
  /** Reseller revenue cache service instance. */
  private readonly _resellerRevenueCacheService = inject(ResellerRevenueCacheService);

  /** Products cache service instance, for the names of the products. */
  private readonly _productsCacheService = inject(ProductsCacheService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Resellers API service instance, for the code of the reseller. */
  private readonly _resellersApiService = inject(ResellersApiService);

  /** Collaborators API service instance, for the salespeople of the reseller. */
  private readonly _collaboratorsApiService = inject(CollaboratorsApiService);

  /** Reseller whose revenue is shown. */
  resellerId = input.required<string>();

  /** Search filter of the salesperson combobox. */
  readonly comboboxContainsFilter = comboboxContainsFilter;

  /** Chart colors, read from the CSS tokens. */
  private _chart: ChartTheme = readChartTheme();

  /** Revenue cards data. */
  revenueCards: CardItem[] = [];

  /** Revenue cards animated display values. */
  revenueDisplayValues: string[] = [];

  /** ECharts option for the revenue and margin trend line chart. */
  revenueLineOption: EChartsOption | null = null;

  /** ECharts option for the revenue composition pie chart. */
  compositionPieOption: EChartsOption | null = null;

  /** Salesperson filter. */
  salesControl = new FormControl<string | null>(ALL_SALESPEOPLE);

  /** Time mode of the section. */
  revenueTime = signal<Period>(Period.Monthly);

  /** Salesperson whose sales are shown, null for the whole reseller. */
  salesId = signal<string | null>(null);

  /** Whether the user sees the margin and filters by salesperson: everyone but the reseller salesperson. */
  readonly canViewMargin = computed(() => this._permissions.can(Capability.ViewResellerMargin));

  /** Salespeople of the reseller offered by the filter, after the whole reseller. */
  readonly salesOptions = toSignal(
    toObservable(this.resellerId).pipe(
      switchMap(resellerId => this.canViewMargin()
        ? this._resellersApiService.getReseller(resellerId).pipe(
          switchMap(reseller => this._collaboratorsApiService.getResellerCollaborators(reseller.code, Profile.ResellerSales)),
          map(salespeople => salespeople.map(user => ({ value: user.sub, label: [user.name, user.surname].filter(Boolean).join(' ') || user.email }))),
          // Without the salespeople the filter keeps the whole reseller, and the section still renders.
          catchError(error => {
            console.error('Error loading the salespeople of the reseller:', error);
            return of([]);
          }),
        )
        : of([])),
      map(salespeople => [{ value: ALL_SALESPEOPLE, label: 'Tutti i commerciali' }, ...salespeople]),
    ),
    { initialValue: [{ value: ALL_SALESPEOPLE, label: 'Tutti i commerciali' }] as ComboboxOption[] },
  );

  /** Label of a salesperson of the filter. */
  readonly salesLabel = (value: string): string => this.salesOptions().find(option => option.value === value)?.label ?? '';

  /** Whether the figures of the current selection are still loading, so the placeholders show. */
  isLoading = signal<boolean>(true);

  /**
   * Constructor of the component.
   */
  constructor() {
    // Start every reseller from the whole reseller: a salesperson of another one would read nothing.
    effect(() => {
      this.resellerId();

      untracked(() => this.salesControl.setValue(ALL_SALESPEOPLE));
    });

    // Read the revenue again when the reseller or the salesperson change.
    effect(() => {
      this.resellerId();
      this.salesId();

      untracked(() => {
        this._chart = readChartTheme();
        this._load();
      });
    });

    // Narrow the section to the salesperson picked.
    this.salesControl.valueChanges.pipe(takeUntilDestroyed()).subscribe(value => {
      this.salesId.set(value && value !== ALL_SALESPEOPLE ? value : null);
    });
  }

  /**
   * Handles the time selector change and reads the revenue of the new mode.
   * @param value the selected time mode ('MONTHLY' or 'ANNUAL').
   */
  onRevenueTimeChange(value: string): void {
    this.revenueTime.set(value as Period);
    this._load();
  }

  /**
   * Reads the revenue of the current selection, through the cache, and builds cards and charts from it.
   */
  private _load(): void {
    const resellerId = this.resellerId();
    const salesId = this.salesId();
    const period = this.revenueTime();
    const isMonthly = period === Period.Monthly;

    // A late answer for another selection must not overwrite the current one.
    const isCurrent = (): boolean => resellerId === this.resellerId() && salesId === this.salesId() && period === this.revenueTime();
    this.isLoading.set(true);

    this._resellerRevenueCacheService.refreshResellerRevenueMetrics(resellerId, period, records => {
      if (!isCurrent()) return;

      this._process(records, isMonthly);
      this.isLoading.set(false);
    }, isMonthly ? 12 : 5, salesId ?? undefined, () => {
      if (isCurrent()) this.isLoading.set(false);
    });
  }

  /**
   * Processes raw revenue records into cards, pie chart composition and line chart data.
   * @param records the raw revenue records from the API.
   * @param isMonthly true for monthly period, false for annual.
   */
  private _process(records: CoreResponseResellerRevenueDashboardMetricsRecordDto[], isMonthly: boolean): void {
    const productNameMap = new Map(this._productsCacheService.products().map(product => [product.id, product.name]));
    const showMargin = this.canViewMargin();
    const label = isMonthly ? '' : ' ultimo anno';
    const keys = this._periodKeys(isMonthly);
    const current = keys[keys.length - 1];
    const cardRecords = records.filter(record => record.monthIndex === current);

    const totalNetto = cardRecords.reduce((sum, record) => sum + record.revenue, 0) / 100;
    const totalLordo = totalNetto * (1 + VAT_RATE_PERCENT / 100);
    const totalExpenses = cardRecords.reduce((sum, record) => sum + (record.expenses ?? 0), 0) / 100;
    const totalMargin = cardRecords.reduce((sum, record) => sum + (record.margin ?? 0), 0) / 100;
    this.revenueCards = [
      { name: `Fatturato lordo${label} (IVA incl.)`, value: totalLordo, prefix: '€ ', decimals: 2, icon: 'lucideReceiptEuro' },
      { name: `Fatturato netto${label}`, value: totalNetto, prefix: '€ ', decimals: 2, icon: 'lucideEuro' },
      ...(showMargin ? [
        { name: `Spese${label}`, value: totalExpenses, prefix: '€ ', decimals: 2, icon: 'lucideWallet' },
        { name: `Margine${label}`, value: totalMargin, prefix: '€ ', decimals: 2, icon: 'lucideHandCoins' },
      ] : []),
    ];

    const revenueByProduct = new Map<string, number>();
    for (const record of cardRecords) {
      const name = record.productId ? productNameMap.get(record.productId) ?? record.productId : 'Altri servizi';
      revenueByProduct.set(name, (revenueByProduct.get(name) ?? 0) + record.revenue / 100);
    }
    this.compositionPieOption = buildPieOption(this._chart, Array.from(revenueByProduct, ([name, value]) => ({ name, value })));

    const sumOf = (key: string, field: 'revenue' | 'expenses' | 'margin') => records
      .filter(record => record.monthIndex === key)
      .reduce((sum, record) => sum + (record[field] ?? 0), 0) / 100;
    this.revenueLineOption = buildLineOption(
      this._chart,
      keys.map(key => isMonthly ? formatMonthIndex(key) : key),
      [
        { name: 'Fatturato', data: keys.map(key => sumOf(key, 'revenue')) },
        ...(showMargin ? [
          { name: 'Spese', data: keys.map(key => sumOf(key, 'expenses')) },
          { name: 'Margine', data: keys.map(key => sumOf(key, 'margin')) },
        ] : []),
      ],
      formatChartEuro,
    );

    this.revenueDisplayValues = this.revenueCards.map(() => '0');
    animateCards(this.revenueCards, this.revenueDisplayValues);
  }

  /**
   * Lists the months or the years of the trend, oldest first: the reseller records only the periods it billed in.
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
