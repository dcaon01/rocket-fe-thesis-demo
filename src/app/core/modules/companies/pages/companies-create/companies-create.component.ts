import { Component, inject, ViewChild } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { finalize } from 'rxjs';
import { CoreCreateCompanyDto } from '../../../../../../../libs/api/src';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { CompaniesApiService } from '../../../../services/api-services/companies/companies-api.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { CompanyFormComponent } from '../../components/company-form/company-form.component';
import { CreateEditCompanyForm } from '../../interfaces/create-edit-company-form.interface';
import { FormToolbarComponent } from '../../../../components/form-toolbar/form-toolbar.component';

/**
 * Component for creating a new company.
 */
@Component({
  selector: 'rocket-companies-create',
  imports: [
    ...HlmButtonImports,
    ...HlmTooltipImports,
    PageHeaderComponent,
    CompanyFormComponent,
    FormToolbarComponent,
  ],
  templateUrl: './companies-create.component.html',
  styleUrl: './companies-create.component.css'
})
export class CompaniesCreateComponent {
  /** Companies api service. */
  private readonly _companiesService = inject(CompaniesApiService);

  /** Router service. */
  private readonly _router = inject(Router);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Whether the viewer works at a reseller, for the description of the page. */
  readonly isReseller = this._permissions.isReseller;

  /** Activated route. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** View child reference to the company form component. */
  @ViewChild('form') form!: CompanyFormComponent;

  /**
   * Handles the creation of a new company.
   * @param companyForm the company form data got from the child form component.
   */
  createCompany(companyForm: FormGroup<CreateEditCompanyForm>) {
    const legalAddress = this.form.buildLegalAddress();
    const referent = this.form.buildReferent();
    const newCompany: CoreCreateCompanyDto = {
      name: companyForm.value.name!,
      email: companyForm.value.email!,
      phoneNumber: companyForm.value.phoneNumber ?? undefined,
      ...(legalAddress ? { legalAddress } : {}),
      ...(referent ? { referent } : {}),
      vatNumber: companyForm.value.vatNumber ?? undefined,
      pec: companyForm.value.pec ?? undefined,
      sdi: companyForm.value.sdi ?? undefined,
      fiscalCode: companyForm.value.fiscalCode ?? undefined,
      iban: companyForm.value.iban ?? undefined
    };

    this._companiesService.createCompany(newCompany).pipe(finalize(() => {
      this._router.navigate(['..'], { relativeTo: this._activatedRoute });
    })).subscribe();
  }
}
