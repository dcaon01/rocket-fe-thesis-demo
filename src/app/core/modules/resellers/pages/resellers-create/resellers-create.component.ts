import { Component, inject, viewChild } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { finalize } from 'rxjs';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { CoreCreateResellerDto } from '../../../../../../../libs/api/src';
import { ResellersApiService } from '../../../../services/api-services/resellers/resellers-api.service';
import { ResellerFormComponent } from '../../components/reseller-form/reseller-form.component';
import { CreateEditResellerForm } from '../../interfaces/create-edit-reseller-form.interface';
import { FormToolbarComponent } from '../../../../components/form-toolbar/form-toolbar.component';

/**
 * Component for creating a new reseller.
 */
@Component({
  selector: 'rocket-resellers-create',
  imports: [
    ...HlmButtonImports,
    ...HlmTooltipImports,
    PageHeaderComponent,
    ResellerFormComponent,
    FormToolbarComponent,
  ],
  templateUrl: './resellers-create.component.html',
  styleUrl: './resellers-create.component.css'
})
export class ResellersCreateComponent {
  /** Resellers api service. */
  private readonly _resellersService = inject(ResellersApiService);

  /** Router service. */
  private readonly _router = inject(Router);

  /** Reference to the reseller form component. */
  form = viewChild<ResellerFormComponent>('form');

  /**
   * Handles the creation of a new reseller.
   * @param resellerForm the reseller form data got from the child form component.
   */
  createReseller(resellerForm: FormGroup<CreateEditResellerForm>) {
    const value = resellerForm.getRawValue();
    const legalAddress = this.form()?.buildLegalAddress();

    const newReseller: CoreCreateResellerDto = {
      code: value.code!,
      companyName: value.companyName!,
      email: value.email!,
      phoneNumber: value.phoneNumber ?? undefined,
      vatNumber: value.vatNumber ?? undefined,
      pec: value.pec ?? undefined,
      sdi: value.sdi ?? undefined,
      iban: value.iban ?? undefined,
      fiscalCode: value.fiscalCode ?? undefined,
      ...(legalAddress ? { legalAddress } : {}),
      ...(value.assignedSalesId ? {
        assignedSalesId: value.assignedSalesId,
        assignedSalesName: this.form()?.assignedSalesNameOf(value.assignedSalesId),
      } : {}),
    };

    this._resellersService.createReseller(newReseller).pipe(finalize(() => {
      this._router.navigate(['/resellers']);
    })).subscribe();
  }
}
