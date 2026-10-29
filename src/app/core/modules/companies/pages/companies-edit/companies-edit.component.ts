import { Component, computed, inject, ViewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { finalize, switchMap } from 'rxjs';
import { CoreUpdateCompanyDto } from '../../../../../../../libs/api/src';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { Capability } from '../../../../enums/capability.enum';
import { CompaniesApiService } from '../../../../services/api-services/companies/companies-api.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { CompanyFormComponent } from '../../components/company-form/company-form.component';
import { CreateEditCompanyForm } from '../../interfaces/create-edit-company-form.interface';

/**
 * Component for editing an existing company.
 */
@Component({
  selector: 'rocket-companies-edit',
  imports: [
    ...HlmButtonImports,
    ...HlmTooltipImports,
    PageHeaderComponent,
    CompanyFormComponent,
  ],
  templateUrl: './companies-edit.component.html',
  styleUrl: './companies-edit.component.css'
})
export class CompaniesEditComponent {
  /** Companies api service. */
  private readonly _companiesService = inject(CompaniesApiService);

  /** Activated route. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** Router service. */
  private readonly _router = inject(Router);

  /** Permissions service. */
  private readonly _permissions = inject(PermissionsService);

  /** Whether the viewer works at a reseller, for the description of the page. */
  readonly isReseller = this._permissions.isReseller;

  /** Whether the user can edit companies. */
  readonly canManage = computed(() => this._permissions.can(Capability.ManageCompanies));

  /** Signal to hold company data for editing, read again when the route moves to another company, as a twin link does. */
  readonly companyData = toSignal(
    this._activatedRoute.paramMap.pipe(switchMap(params => this._companiesService.getCompany(params.get('companyId') ?? '')))
  );

  /** View child reference to the company form component. */
  @ViewChild('form') form!: CompanyFormComponent;

  /**
   * Method to handle company editing logic.
   * @param companyForm the company form data got from the child form component.
   */
  editCompany(companyForm: FormGroup<CreateEditCompanyForm>) {
    if (!companyForm.dirty) return;

    const updateCompany: CoreUpdateCompanyDto = {};

    if (companyForm.get('name')?.dirty) updateCompany.name = companyForm.value.name ?? undefined;
    if (companyForm.get('email')?.dirty) updateCompany.email = companyForm.value.email ?? undefined;
    if (companyForm.get('phoneNumber')?.dirty) updateCompany.phoneNumber = companyForm.value.phoneNumber || null;
    if (companyForm.get('legalAddress')?.dirty) updateCompany.legalAddress = this.form.buildLegalAddress();
    if (companyForm.get('referent')?.dirty) updateCompany.referent = this.form.buildReferent();
    if (companyForm.get('vatNumber')?.dirty) updateCompany.vatNumber = companyForm.value.vatNumber || null;
    if (companyForm.get('pec')?.dirty) updateCompany.pec = companyForm.value.pec || null;
    if (companyForm.get('sdi')?.dirty) updateCompany.sdi = companyForm.value.sdi || null;
    if (companyForm.get('fiscalCode')?.dirty) updateCompany.fiscalCode = companyForm.value.fiscalCode || null;
    if (companyForm.get('iban')?.dirty) updateCompany.iban = companyForm.value.iban || null;
    if (companyForm.get('status')?.dirty) updateCompany.status = companyForm.value.status ?? undefined;

    this._companiesService.updateCompany(this.companyData()?.id ?? '', updateCompany).pipe(finalize(() => {
      this._router.navigate(['../..'], { relativeTo: this._activatedRoute });
    })).subscribe();
  }
}
