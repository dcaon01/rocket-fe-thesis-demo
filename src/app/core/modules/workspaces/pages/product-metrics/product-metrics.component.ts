import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideExternalLink, lucideInbox, lucideSearch } from '@ng-icons/lucide';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { map } from 'rxjs';
import { CoreMixpanelLeverRule, CoreResponseLeverResultDto, CoreResponseRuleResultDto, CoreResponseTenantDto } from '../../../../../../../libs/api/src';
import { DateRangeFilterComponent } from '../../../../components/date-range-filter/date-range-filter.component';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { TablePaginationComponent } from '../../../../components/table-pagination/table-pagination.component';
import { LeverOutcomeDirective } from '../../../../directives/lever-outcome.directive';
import { LeverOutcome } from '../../../../enums/lever-outcome.enum';
import { MixpanelInactivityScope } from '../../../../enums/mixpanel-inactivity-scope.enum';
import { MixpanelLever } from '../../../../enums/mixpanel-lever.enum';
import { MixpanelRuleUnit } from '../../../../enums/mixpanel-rule-unit.enum';
import { MixpanelRuleShape } from '../../../../enums/mixpanel-rule-shape.enum';
import { DateRange } from '../../../../interfaces/date-range.interface';
import { LeverOutcomePipe } from '../../../../pipes/lever-outcome/lever-outcome.pipe';
import { MixpanelLeverPipe } from '../../../../pipes/mixpanel-lever/mixpanel-lever.pipe';
import { MixpanelInactivityScopePipe } from '../../../../pipes/mixpanel-inactivity-scope/mixpanel-inactivity-scope.pipe';
import { MixpanelRuleShapePipe } from '../../../../pipes/mixpanel-rule-shape/mixpanel-rule-shape.pipe';
import { MixpanelRuleUnitPipe } from '../../../../pipes/mixpanel-rule-unit/mixpanel-rule-unit.pipe';
import { ProductsApiService } from '../../../../services/api-services/products/products-api.service';
import { TenantsApiService } from '../../../../services/api-services/tenants/tenants-api.service';
import { ProductAdoptionCacheService } from '../../../../services/cache/product-adoption-cache.service';
import { CursorPaginationService } from '../../../../services/pagination/cursor-pagination.service';
import { mixpanelProjectUrl } from '../../../../utils/external-links.util';
import { orUndefined, sameFilters } from '../../../../utils/filters.util';
import { ProductAdoptionSectionComponent } from '../../../dashboard/components/product-adoption-section/product-adoption-section.component';
import { Period } from '../../../dashboard/enums/period.enum';
import { FilterProductMetricsForm } from '../../interfaces/filter-product-metrics-form.interface';

/** Singular of each time unit of the rules, for a value of one. */
const SINGULAR_UNITS: Record<string, string> = {
  [MixpanelRuleUnit.Days]: 'giorno',
  [MixpanelRuleUnit.WorkingDays]: 'giorno lavorativo',
  [MixpanelRuleUnit.Weeks]: 'settimana',
};

/** Values of the product metrics filters. */
type ProductMetricsFilterValues = ReturnType<FormGroup<FilterProductMetricsForm>['getRawValue']>;

/**
 * Product metrics of the workspace (UR-RK-223): the adoption counts of the product over time, and how each of its
 * companies came out of the key rule of every lever on the last day of the chosen period.
 */
@Component({
  selector: 'rocket-product-metrics',
  imports: [
    ...BrnSelectImports,
    ...HlmBadgeImports,
    ...HlmButtonImports,
    ...HlmEmptyImports,
    ...HlmInputImports,
    ...HlmInputGroupImports,
    ...HlmLabelImports,
    ...HlmSelectImports,
    ...HlmTableImports,
    DateRangeFilterComponent,
    PageHeaderComponent,
    ProductAdoptionSectionComponent,
    TablePaginationComponent,
    LeverOutcomeDirective,
    LeverOutcomePipe,
    MixpanelLeverPipe,
    NgIcon,
    ReactiveFormsModule,
  ],
  providers: [CursorPaginationService, provideIcons({ lucideExternalLink, lucideSearch, lucideInbox })],
  templateUrl: './product-metrics.component.html',
  styleUrl: './product-metrics.component.css'
})
export class ProductMetricsComponent {
  /** Activated route instance. */
  private readonly _route = inject(ActivatedRoute);

  /** Tenants api service. */
  private readonly _tenantsApiService = inject(TenantsApiService);

  /** Products api service. */
  private readonly _productsApiService = inject(ProductsApiService);

  /** Product adoption cache service. */
  private readonly _adoptionCacheService = inject(ProductAdoptionCacheService);

  /** Pages of the tenants. */
  readonly pager = inject<CursorPaginationService<CoreResponseTenantDto>>(CursorPaginationService);

  /** Product id from the route. */
  readonly productId = this._route.snapshot.paramMap.get('productId') ?? '';

  /** Link to the Mixpanel project of the product, absent when it has none. */
  readonly mixpanelUrl = signal<string | null>(null);

  /** Levers, one column each. */
  readonly levers = Object.values(MixpanelLever);

  /** Labels of the time units, for the measured values. */
  private readonly _unitLabel = new MixpanelRuleUnitPipe();

  /** Labels of the shapes, for the name of a rule. */
  private readonly _shapeLabel = new MixpanelRuleShapePipe();

  /** Labels of what an inactivity looks at, for the name of a rule. */
  private readonly _scopeLabel = new MixpanelInactivityScopePipe();

  /** Filters the page opens with, over the last 30 days, and that the reset brings back. */
  private readonly _defaultFilters: ProductMetricsFilterValues = { search: null, period: { from: this._defaultRange()[0], to: this._defaultRange()[1] } };

  /** Form group for filtering the tenants and choosing the period. */
  filterForm = new FormGroup<FilterProductMetricsForm>({
    search: new FormControl<string | null>(this._defaultFilters.search),
    period: new FormControl<DateRange | null>(this._defaultFilters.period),
  });

  /** Time mode of the adoption counts. */
  period = signal<Period>(Period.Monthly);

  /** Filters applied to the list. */
  appliedFilters = signal<ProductMetricsFilterValues>(this._defaultFilters);

  /** Values of the filter form, as a signal. */
  private readonly _formValue = toSignal(
    this.filterForm.valueChanges.pipe(map(() => this.filterForm.getRawValue())),
    { initialValue: this.filterForm.getRawValue() },
  );

  /** Whether the form holds filters other than the applied ones. */
  readonly canApply = computed(() => !sameFilters(this._formValue(), this.appliedFilters()));

  /** Whether the applied filters differ from the defaults. */
  readonly isFiltered = computed(() => !sameFilters(this.appliedFilters(), this._defaultFilters));

  /** Outcomes on the levers, by tenant id. */
  private readonly _outcomesByTenant = signal<Map<string, CoreResponseLeverResultDto[]>>(new Map());

  /** Rules of the product, by identifier. */
  private readonly _rules = signal<Map<string, CoreMixpanelLeverRule>>(new Map());

  /** Table rows: the tenants of the page, with their outcome on each lever, absent when the lever does not judge them. */
  readonly rows = computed(() => {
    const outcomes = this._outcomesByTenant();
    return this.pager.items().map(tenant => {
      const results = outcomes.get(tenant.id) ?? [];
      return { tenant, results: new Map(results.map(result => [result.lever as string, result])) };
    });
  });

  /**
   * Constructor of the page component.
   */
  constructor() {
    // Read the rules of the product, for the unit of the measured values, and its Mixpanel project for the link.
    this._productsApiService.getProduct(this.productId).subscribe(product => {
      this._rules.set(new Map((product.mixpanelRules ?? []).map(rule => [rule.id as string, rule])));
      this.mixpanelUrl.set(product.mixpanelProjectId ? mixpanelProjectUrl(product.mixpanelProjectId) : null);
    });

    // Read the first page of tenants and their outcomes whenever the applied filters change.
    effect(() => {
      const { search, period } = this.appliedFilters();
      untracked(() => {
        this.pager.load(page => this._tenantsApiService.listTenants(page, { productId: this.productId, search: orUndefined(search) }));
        const { from, to } = this._periodOf(period);
        this._loadOutcomes(from, to);
      });
    });
  }

  /**
   * Handles the time selector change of the adoption counts.
   * @param value the selected time mode ('MONTHLY' or 'ANNUAL').
   */
  onPeriodChange(value: string): void {
    this.period.set(value as Period);
  }

  /**
   * Builds the lines a lever shows under its badge: the measured value when the lever has one rule, otherwise the
   * rules that are at risk or failing, each with its name and value.
   * @param result the outcome of the lever.
   * @returns the lines, with the name of the rule when the lever has more than one.
   */
  cellLines(result: CoreResponseLeverResultDto): { label: string | null; text: string }[] {
    if (result.rules.length <= 1) {
      const text = result.rules.length === 1 ? this._formatValue(result.rules[0]) : '';
      return text ? [{ label: null, text }] : [];
    }

    return result.rules
      .filter(rule => rule.outcome === LeverOutcome.AtRisk || rule.outcome === LeverOutcome.Failing)
      .map(rule => ({ label: this._ruleLabel(this._rules().get(rule.ruleId)), text: this._formatValue(rule) }));
  }

  /**
   * Formats the measured value of a rule outcome in the unit of the rule.
   * @param result the outcome of the rule.
   * @returns the value with its unit, or an empty string when nothing was measured.
   */
  private _formatValue(result: CoreResponseRuleResultDto): string {
    if (result.value === null || result.value === undefined) {
      return '';
    }

    const rule = this._rules().get(result.ruleId);
    const value = result.value.toLocaleString('it-IT', { maximumFractionDigits: 1 });
    if (!rule) {
      return value;
    }
    if (rule.shape === MixpanelRuleShape.Coverage) {
      return `${value} %`;
    }
    if (rule.shape === MixpanelRuleShape.Milestone || rule.shape === MixpanelRuleShape.Inactivity) {
      // Time reads in whole units: nobody counts days with decimals.
      const whole = Math.round(result.value);
      return `${whole} ${whole === 1 ? SINGULAR_UNITS[rule.unit] ?? rule.unit : this._unitLabel.transform(rule.unit).toLowerCase()}`;
    }
    return value;
  }

  /**
   * Names a rule from its shape and its scope, since rules have no name of their own; the events stay out.
   * @param rule the rule.
   * @returns the name, for example «Inattività per utente».
   */
  private _ruleLabel(rule: CoreMixpanelLeverRule | undefined): string {
    if (!rule) {
      return 'Regola';
    }

    const scope = rule.shape === MixpanelRuleShape.Inactivity && rule.inactivityScope && rule.inactivityScope !== MixpanelInactivityScope.Tenant
      ? ` per ${this._scopeLabel.transform(rule.inactivityScope).toLowerCase()}`
      : '';
    return `${this._shapeLabel.transform(rule.shape)}${scope}`;
  }

  /**
   * Applies the filters of the form and reads the first page.
   */
  applyFilters(): void {
    this.appliedFilters.set(this.filterForm.getRawValue());
  }

  /**
   * Brings the filters back to their defaults and reads the first page.
   */
  resetFilters(): void {
    this.filterForm.reset(this._defaultFilters);
    this.appliedFilters.set(this._defaultFilters);
  }

  /**
   * Loads the outcomes of the tenants of the product on the last day of a period (cached per period).
   * @param from the first day of the period.
   * @param to the last day of the period.
   */
  private _loadOutcomes(from: Date, to: Date): void {
    const [fromIso, toIso] = [this._toIso(from), this._toIso(to)];
    // A late answer, or a late failure, for another period must not touch the current one.
    const isCurrent = (): boolean => {
      const applied = this._periodOf(this.appliedFilters().period);
      return this._toIso(applied.from) === fromIso && this._toIso(applied.to) === toIso;
    };

    this._adoptionCacheService.refreshTenantOutcomes(fromIso, toIso, this.productId, rows => {
      if (isCurrent()) this._outcomesByTenant.set(new Map(rows.map(row => [row.tenantId, row.levers])));
    }, () => {
      if (isCurrent()) this._outcomesByTenant.set(new Map());
    });
  }

  /**
   * Completes a period with the default bounds where it has none.
   * @param period the period of the filter.
   * @returns the period with both bounds.
   */
  private _periodOf(period: DateRange | null): { from: Date; to: Date } {
    const [from, to] = this._defaultRange();
    return { from: period?.from ?? from, to: period?.to ?? to };
  }

  /**
   * Builds the default period: the last 30 days.
   * @returns the first and the last day.
   */
  private _defaultRange(): [Date, Date] {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return [from, to];
  }

  /**
   * Formats a date as YYYY-MM-DD.
   * @param date the date.
   * @returns the formatted date.
   */
  private _toIso(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
