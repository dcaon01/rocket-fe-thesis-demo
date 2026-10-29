import { Component, inject, viewChild } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { CoreCreateTenantDto, CoreProvisionLineDto, CoreStructureField } from '../../../../../../../libs/api/src';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { TenantsApiService } from '../../../../services/api-services/tenants/tenants-api.service';
import { OrdersApiService } from '../../../../services/api-services/orders/orders-api.service';
import { ProductsCacheService } from '../../../../services/cache/products-cache.service';
import { CreateEditTenantForm } from '../../interfaces/create-edit-tenant-form';
import { TenantFormComponent } from '../../components/tenant-form/tenant-form.component';
import { StructureDynamicFormService } from '../../services/structure-dynamic-form/structure-dynamic-form.service';
import { TenantOrigin } from '../../enums/tenant-origin.enum';
import { FormToolbarComponent } from '../../../../components/form-toolbar/form-toolbar.component';

@Component({
  selector: 'rocket-tenants-create',
  imports: [
    ...HlmButtonImports,
    ...HlmTooltipImports,
    PageHeaderComponent,
    TenantFormComponent,
    FormToolbarComponent,
  ],
  templateUrl: './tenants-create.component.html',
  styleUrl: './tenants-create.component.css'
})
export class TenantsCreateComponent {
  /** Activated route instance */
  private readonly _activatedRoute = inject(ActivatedRoute)

  /** Router service. */
  private readonly _router = inject(Router);

  /** Tenants api service instance. */
  private readonly _tenantsApiService = inject(TenantsApiService);

  /** Orders api service instance. */
  private readonly _ordersApiService = inject(OrdersApiService);


  /** Products cache service instance. */
  private readonly _productsCacheService = inject(ProductsCacheService);

  /** Product ID signal from route parameters. */
  productId = this._activatedRoute.snapshot.params['productId'];

  /** View child reference to the product form component. */
  form = viewChild<TenantFormComponent>('form');

  /**
   * Handles the creation of a new tenant.
   * @param tenantsForm The form group containing the tenant data.
   */
  createTenant(tenantsForm: FormGroup<CreateEditTenantForm>): void {
    if (tenantsForm.value.origin === TenantOrigin.OrderLine) {
      this._provisionLine(tenantsForm);
      return;
    }

    // Extract dynamic data fields from the form and parse by structure type.
    const dataGroup = tenantsForm.controls.data as FormGroup;
    let rawData: { [key: string]: any } = {}
    Object.keys(dataGroup.controls).forEach(controlName => {
      rawData[controlName] = (dataGroup.controls as any)[controlName].value;
    });
    const tenantStructure = this._productsCacheService.products().find(p => p.id === this.productId)?.tenantStructure || [];
    const data = StructureDynamicFormService.parseDataByStructure(rawData, tenantStructure);

    const trialId = tenantsForm.value.trialId;

    // Construct the new tenant DTO.
    const newTenant: CoreCreateTenantDto = {
      productId: this._activatedRoute.snapshot.params['productId'],
      name: tenantsForm.value.name!,
      description: tenantsForm.value.description ?? undefined,
      accountType: tenantsForm.value.accountType ?? undefined,
      data: data,
      maxConstraintValue: 0, // Set below from the trial
    };

    if (trialId) {
      newTenant.trialId = trialId;
      newTenant.trialEmail = this.form()?.trials.labelOf(trialId);
      newTenant.maxConstraintValue = 1; // Trial tenants typically have limited seats
    }

    // Call the API to create the tenant and navigate back once it is requested; on an error the form stays.
    this._tenantsApiService.createTenant(newTenant).subscribe(() => {
      this._router.navigate(['../'], { relativeTo: this._activatedRoute });
    });
  }

  /**
   * Creates the tenant of an order line with its referent, as the provisioning of the line does: the tenant is asked
   * to the product, the referent follows its confirmation, and the contract is born with the line.
   * @param tenantsForm the form group containing the tenant, the line and the referent.
   */
  private _provisionLine(tenantsForm: FormGroup<CreateEditTenantForm>): void {
    const product = this._productsCacheService.products().find(p => p.id === this.productId);
    const { name, description, data, orderId, referent } = tenantsForm.getRawValue();
    const provision: CoreProvisionLineDto = {
      tenant: {
        name: name!,
        ...(description && { description }),
        data: this._parseData(data, product?.tenantStructure ?? []),
      },
      users: [{
        email: referent.email!,
        roles: referent.roles,
        ...(referent.name && { name: referent.name }),
        ...(referent.surname && { surname: referent.surname }),
        data: this._parseData(referent.data, product?.userStructure ?? []),
      }],
    };
    this._ordersApiService.provisionLine(orderId!, this.productId, provision).subscribe(() => {
      this._router.navigate(['../'], { relativeTo: this._activatedRoute });
    });
  }

  /**
   * Turns the values of a structure group into the data the backend expects, without the generated fields.
   * @param values the raw values of the group.
   * @param structure the structure.
   * @returns the data.
   */
  private _parseData(values: Record<string, unknown>, structure: CoreStructureField[]): Record<string, unknown> {
    const fields = structure.filter(field => !field.generated);
    const parsed = StructureDynamicFormService.parseDataByStructure(values, fields);
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) => value !== null && value !== undefined && value !== ''));
  }
}
