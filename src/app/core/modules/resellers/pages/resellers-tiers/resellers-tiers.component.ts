import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideAward, lucideGem, lucideMedal, lucideSave } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { CoreUpsertResellerTierConfigDto } from '../../../../../../../libs/api/src';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { ResellersApiService } from '../../../../services/api-services/resellers/resellers-api.service';
import { ResellerTierConfigForm } from '../../interfaces/reseller-tier-config-form.interface';
import { ToasterService } from '../../../../services/toaster/toaster.service';
import { MoneyInputDirective } from '../../../../directives/money-input.directive';

/** Commercial tier of a reseller, as the API spells it. */
type ResellerTier = 'SILVER' | 'GOLD' | 'PLATINUM';

/**
 * Page of the fees: the yearly fee and the margins attached to each commercial tier.
 * Editing a tier changes what the contracts opened afterwards get: the ones already
 * opened keep the terms copied onto them.
 */
@Component({
  selector: 'rocket-resellers-tiers',
  imports: [
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmInputImports,
    ...HlmLabelImports,
    ...HlmTabsImports,
    MoneyInputDirective,
    PageHeaderComponent,
    ReactiveFormsModule,
    NgIcon
  ],
  providers: [
    provideIcons({
      lucideAward,
      lucideGem,
      lucideMedal,
      lucideSave
    })
  ],
  templateUrl: './resellers-tiers.component.html',
  styleUrl: './resellers-tiers.component.css'
})
export class ResellersTiersComponent {
  /** Resellers api service. */
  private readonly _resellersService = inject(ResellersApiService);

  /** Toaster service instance. */
  private readonly _toasterService = inject(ToasterService);

  /** Tiers shown on the page, in commercial order. */
  readonly tiers: { id: ResellerTier; label: string; icon: string }[] = [
    { id: 'SILVER', label: 'Silver', icon: 'lucideAward' },
    { id: 'GOLD', label: 'Gold', icon: 'lucideMedal' },
    { id: 'PLATINUM', label: 'Platinum', icon: 'lucideGem' },
  ];

  /** One form per tier, keyed by the tier itself. */
  readonly tierForms: Record<ResellerTier, FormGroup<ResellerTierConfigForm>> = {
    SILVER: this._buildTierForm(),
    GOLD: this._buildTierForm(),
    PLATINUM: this._buildTierForm(),
  };

  /** Signal holding the tier currently shown. */
  activeTab = signal<ResellerTier>('SILVER');

  /**
   * Constructor that loads the configurations already stored.
   */
  constructor() {
    // Load the tier configurations on initialization.
    this._resellersService.getTierConfigs().subscribe({
      next: (configs) => {
        for (const config of configs) {
          this.tierForms[config.tier].patchValue({
            firstYearFee: config.firstYearFeeCents / 100,
            secondYearFee: config.secondYearFeeCents / 100,
            ongoingFee: config.ongoingFeeCents / 100,
            activationDiscountPercent: config.activationDiscountPercent,
            subscriptionDiscountPercent: config.subscriptionDiscountPercent,
            customizationDiscountPercent: config.customizationDiscountPercent,
          });
        }
      },
      error: (error) => {
        console.error('Error loading the tier configurations:', error);
        this._toasterService.showError('Non è stato possibile leggere le tipologie dei rivenditori.');
      }
    });
  }

  /**
   * Keeps the shown tier in sync with the sidebar selection.
   * @param tabId the id of the newly activated tier.
   */
  onTabActivated(tabId: string): void {
    this.activeTab.set(tabId as ResellerTier);
  }

  /**
   * Writes the configuration of a tier.
   * @param tier the tier to save.
   */
  saveTier(tier: ResellerTier): void {
    const form = this.tierForms[tier];
    if (form.invalid) {
      return;
    }

    const value = form.getRawValue();
    const config: CoreUpsertResellerTierConfigDto = {
      firstYearFeeCents: Math.round((value.firstYearFee ?? 0) * 100),
      secondYearFeeCents: Math.round((value.secondYearFee ?? 0) * 100),
      ongoingFeeCents: Math.round((value.ongoingFee ?? 0) * 100),
      activationDiscountPercent: value.activationDiscountPercent ?? 0,
      subscriptionDiscountPercent: value.subscriptionDiscountPercent ?? 0,
      customizationDiscountPercent: value.customizationDiscountPercent ?? 0,
    };

    this._resellersService.upsertTierConfig(tier, config).subscribe({
      next: () => form.markAsPristine(),
      error: (error) => console.error(`Error saving the ${tier} tier configuration:`, error)
    });
  }

  /**
   * Builds an empty configuration form for a tier.
   * @returns the form group.
   */
  private _buildTierForm(): FormGroup<ResellerTierConfigForm> {
    const fee = [Validators.required, Validators.min(0)];
    const percent = [Validators.required, Validators.min(0), Validators.max(100)];
    return new FormGroup<ResellerTierConfigForm>({
      firstYearFee: new FormControl<number | null>(null, fee),
      secondYearFee: new FormControl<number | null>(null, fee),
      ongoingFee: new FormControl<number | null>(null, fee),
      activationDiscountPercent: new FormControl<number | null>(null, percent),
      subscriptionDiscountPercent: new FormControl<number | null>(null, percent),
      customizationDiscountPercent: new FormControl<number | null>(null, percent),
    });
  }
}
