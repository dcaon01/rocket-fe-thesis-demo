import { Component, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { lucidePlus } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { catchError, map, of } from 'rxjs';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { CognitoUserAttributeDto, CoreCreateUserDto } from '../../../../../../../libs/api/src';
import { ProductsApiService } from '../../../../services/api-services/products/products-api.service';
import { UserFormComponent } from '../../components/user-form/user-form.component';
import { UsersApiService } from '../../../../services/api-services/users/users-api.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { CreateEditUserForm } from '../../interfaces/create-edit-users-form';
import { StructureDynamicFormService } from '../../services/structure-dynamic-form/structure-dynamic-form.service';
import { TenantsApiService } from '../../../../services/api-services/tenants/tenants-api.service';
import { FormToolbarComponent } from '../../../../components/form-toolbar/form-toolbar.component';

@Component({
  selector: 'rocket-users-create',
  imports: [
    ...HlmButtonImports,
    ...HlmTooltipImports,
    PageHeaderComponent,
    UserFormComponent,
    FormToolbarComponent,
  ],
  providers: [
    provideIcons({
      lucidePlus
    })
  ],
  templateUrl: './users-create.component.html',
  styleUrl: './users-create.component.css'
})
export class UsersCreateComponent {
  /** Activated route instance */
  private readonly _activatedRoute = inject(ActivatedRoute)

  /** Router service. */
  private readonly _router = inject(Router);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Whether the viewer works at a reseller, for the description of the page. */
  readonly isReseller = this._permissions.isReseller;

  /** Users API service. */
  private readonly _usersApiService = inject(UsersApiService);

  /** Products API service. */
  private readonly _productsApiService = inject(ProductsApiService);

  /** Tenants API service. */
  private readonly _tenantsApiService = inject(TenantsApiService);

  /** View child reference to the user form component. */
  form = viewChild<UserFormComponent>('form');

  /** Product signal. */
  product = toSignal(this._productsApiService.getProduct(this._activatedRoute.snapshot.params['productId']));

  /** Tenant given in the query, such as the one of a company the user is added from; null, or a tenant that cannot be read, lets the form choose it. */
  readonly fixedTenant = toSignal(
    this._activatedRoute.snapshot.queryParams['tenantId']
      ? this._tenantsApiService.getTenant(this._activatedRoute.snapshot.params['productId'], this._activatedRoute.snapshot.queryParams['tenantId'])
        .pipe(map(tenant => ({ id: tenant.id, name: tenant.name })), catchError(() => of(null)))
      : of(null),
    { initialValue: null },
  );

  /**
   * Creates a new user.
   * @param usersForm the form group containing the new user data.
   */
  createUser(usersForm: FormGroup<CreateEditUserForm>): void {
    // Extract dynamic data fields from the form and parse by structure type.
    const dataGroup = usersForm.controls.data as FormGroup;
    let rawData: { [key: string]: any } = {}
    Object.keys(dataGroup.controls).forEach(controlName => {
      rawData[controlName] = (dataGroup.controls as any)[controlName].value;
    });
    const userStructure = this.product()?.userStructure || [];
    const data = StructureDynamicFormService.parseDataByStructure(rawData, userStructure);

    // Extract custom cognito attributes form the form.
    const customAttributesGroup = usersForm.controls.customAttributes as FormGroup;
    let customAttributes: CognitoUserAttributeDto[] = [];
    Object.keys(customAttributesGroup.controls).forEach(attrName => {
      const value = (customAttributesGroup.controls as any)[attrName].value;
      customAttributes.push({ name: attrName, value: value });
    });

    // Construct the new user DTO.
    const newUser: CoreCreateUserDto = {
      tenant: usersForm.value.tenantId!,
      tenantName: this.form()?.tenantOptionLabel(usersForm.value.tenantId!) || '',
      productId: this._activatedRoute.snapshot.params['productId'],
      productName: this.product()!.name,
      data: data,
      customAttributes: customAttributes,
      email: usersForm.value.email!,
      accountType: usersForm.value.accountType ?? undefined,
      name: usersForm.value.name || undefined,
      roles: usersForm.value.roles || [],
      surname: usersForm.value.surname || undefined,
      ...(usersForm.value.referent && { referent: true }),
    };

    // Create the user via the API.
    this._usersApiService.createUser(newUser).subscribe(() => {
      this._router.navigate([this._activatedRoute.snapshot.data['back'] ?? '../'], { relativeTo: this._activatedRoute });
    });
  }
}
