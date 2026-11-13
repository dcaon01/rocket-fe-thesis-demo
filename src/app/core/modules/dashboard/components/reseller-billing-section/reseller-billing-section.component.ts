import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideInbox, lucideReceiptEuro, lucideWallet } from '@ng-icons/lucide';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmCard } from '@spartan-ng/helm/card';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import type { EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import { CoreResponseInvoiceDto, CoreResponseResellerBillingDto } from '../../../../../../../libs/api/src';
import { InvoiceStatusDirective } from '../../../../directives/invoice-status.directive';
import { InvoiceStatusPipe } from '../../../../pipes/invoice-status/invoice-status.pipe';
import { ResellerBillingCacheService } from '../../../../services/cache/reseller-billing-cache.service';
import { ChartTheme, readChartTheme } from '../../../../utils/chart-theme.util';
import { Period } from '../../enums/period.enum';
import { CardItem } from '../../interfaces/card-item.interface';
import { animateCards, buildLineOption, formatChartEuro, formatMonthIndex } from '../../utils/dashboard-charts.util';
import { KpiSkeletonsComponent } from '../../../../components/kpi-skeletons/kpi-skeletons.component';

/**
 * Posizione economica section of the reseller dashboard (UR-RK-339): what Keus invoiced the reseller in the period,
 * what is still to pay and the part past due, the trend of the invoices and the ones still to pay by due date.
 */
@Component({
  selector: 'rocket-reseller-billing-section',
  imports: [
    ...BrnSelectImports,
    ...HlmBadgeImports,
    ...HlmEmptyImports,
    ...HlmSelectImports,
    ...HlmTableImports,
    ...HlmSkeletonImports,
    HlmCard,
    KpiSkeletonsComponent,
    InvoiceStatusDirective,
    InvoiceStatusPipe,
    CurrencyPipe,
    DatePipe,
    NgIcon,
    NgxEchartsDirective,
  ],
  viewProviders: [provideIcons({ lucideCircleAlert, lucideInbox, lucideReceiptEuro, lucideWallet })],
  templateUrl: './reseller-billing-section.component.html',
})
export class ResellerBillingSectionComponent {
  /** Reseller billing cache service instance. */
  private readonly _resellerBillingCacheService = inject(ResellerBillingCacheService);

  /** Reseller whose economic position is shown. */
  resellerId = input.required<string>();

  /** Chart colors, read from the CSS tokens. */
  private _chart: ChartTheme = readChartTheme();

  /** Billing cards data. */
  billingCards: CardItem[] = [];

  /** Billing cards animated display values. */
  billingDisplayValues: string[] = [];

  /** ECharts option for the trend of the invoices issued by Keus. */
  issuedLineOption: EChartsOption | null = null;

  /** Time mode of the section. */
  billingTime = signal<Period>(Period.Monthly);

  /** Invoices still to pay, the earliest due date first. */
  dues = signal<CoreResponseInvoiceDto[]>([]);

  /** Whether the figures of the current selection are still loading, so the placeholders show. */
  isLoading = signal<boolean>(true);

  /**
   * Constructor of the component.
   */
  constructor() {
    // Read the economic position again when the reseller change.
    effect(() => {
      this.resellerId();

      untracked(() => {
        this._chart = readChartTheme();
        this._load();
      });
    });
  }

  /**
   * Handles the time selector change and reads the economic position of the new mode.
   * @param value the selected time mode ('MONTHLY' or 'ANNUAL').
   */
  onBillingTimeChange(value: string): void {
    this.billingTime.set(value as Period);
    this._load();
  }

  /**
   * Reads the economic position of the current selection, through the cache, and builds cards, chart and list from it.
   */
  private _load(): void {
    const resellerId = this.resellerId();
    const period = this.billingTime();
    const isMonthly = period === Period.Monthly;

    // A late answer for another selection must not overwrite the current one.
    const isCurrent = (): boolean => resellerId === this.resellerId() && period === this.billingTime();
    this.isLoading.set(true);

    this._resellerBillingCacheService.refreshResellerBillingMetrics(resellerId, period, billing => {
      if (!isCurrent()) return;

      this._process(billing, isMonthly);
      this.isLoading.set(false);
    }, isMonthly ? 12 : 5, () => {
      if (isCurrent()) this.isLoading.set(false);
    });
  }

  /**
   * Processes the economic position into cards, line chart and the list of the invoices still to pay.
   * @param billing the economic position from the API.
   * @param isMonthly true for monthly period, false for annual.
   */
  private _process(billing: CoreResponseResellerBillingDto, isMonthly: boolean): void {
    const keys = this._periodKeys(isMonthly);
    const issued = new Map(billing.records.map(record => [record.period, record]));
    const current = issued.get(keys[keys.length - 1]);
    const label = isMonthly ? ' nel mese' : " nell'anno";

    this.billingCards = [
      { name: `Fatturato da Keus${label}`, value: (current?.issuedCents ?? 0) / 100, prefix: '€ ', decimals: 2, icon: 'lucideReceiptEuro' },
      { name: 'Da pagare', value: billing.dueCents / 100, prefix: '€ ', decimals: 2, icon: 'lucideWallet' },
      { name: 'Scaduto', value: billing.overdueCents / 100, prefix: '€ ', decimals: 2, icon: 'lucideCircleAlert' },
    ];

    this.issuedLineOption = buildLineOption(
      this._chart,
      keys.map(key => isMonthly ? formatMonthIndex(key) : key),
      [{ name: 'Fatturato da Keus', data: keys.map(key => (issued.get(key)?.issuedCents ?? 0) / 100) }],
      formatChartEuro,
    );

    this.dues.set(billing.dues);
    this.billingDisplayValues = this.billingCards.map(() => '0');
    animateCards(this.billingCards, this.billingDisplayValues);
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
