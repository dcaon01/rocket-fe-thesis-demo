import { Component, inject, viewChild } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { CoreCreateProductDto, CoreStructureField } from '../../../../../../../libs/api/src';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { TypeEnum } from '../../../../enums/type.enum';
import { ProductsApiService } from '../../../../services/api-services/products/products-api.service';
import { ProductsCacheService } from '../../../../services/cache/products-cache.service';
import { ProductFormComponent } from '../../components/product-form/product-form.component';
import { CreateEditProductForm } from '../../interfaces/create-edit-product-form.interface';
import { FormToolbarComponent } from '../../../../components/form-toolbar/form-toolbar.component';

@Component({
  selector: 'rocket-products-create',
  imports: [
    ...HlmButtonImports,
    ...HlmTooltipImports,
    ...HlmLabelImports,
    PageHeaderComponent,
    ProductFormComponent,
    FormToolbarComponent,
  ],
  templateUrl: './products-create.component.html',
  styleUrl: './products-create.component.css'
})
export class ProductsCreateComponent {
  /** Products api service. */
  private readonly _productsService = inject(ProductsApiService);

  /** Products cache service. */
  private readonly _productsCacheService = inject(ProductsCacheService);

  /** Router service. */
  private readonly _router = inject(Router);

  /** View child reference to the product form component. */
  form = viewChild<ProductFormComponent>('form');

  /**
   * Handles the creation of a new product.
   * @param productForm The form group containing the product data.
   */
  createProduct(productForm: FormGroup<CreateEditProductForm>): void {
    let tenantStructure: CoreStructureField[] = [];
    let userStructure: CoreStructureField[] = [];

    productForm.value.tenantStructure?.forEach(fieldForm => {
      tenantStructure.push({
        name: fieldForm.name!,
        type: fieldForm.type! as TypeEnum,
        required: fieldForm.required!,
        array: fieldForm.array!,
        generated: fieldForm.generated!,
        notModifiable: fieldForm.notModifiable!
      });
    });

    productForm.value.userStructure?.forEach(fieldForm => {
      userStructure.push({
        name: fieldForm.name!,
        type: fieldForm.type! as TypeEnum,
        required: fieldForm.required!,
        array: fieldForm.array!,
        generated: fieldForm.generated!,
        notModifiable: fieldForm.notModifiable!
      });
    });

    const newProduct: CoreCreateProductDto = {
      name: productForm.value.name!,
      description: productForm.value.description ?? undefined,
      prefix: productForm.value.prefix!,
      tenantStructure: tenantStructure,
      userStructure: userStructure,
      customAttributes: productForm.value.customAttributes || [],
      roles: productForm.value.roles || [],
      hubspotSolution: productForm.value.hubspotSolution || undefined,
      intercomBrand: productForm.value.intercomBrand || undefined,
      sentryProjectId: productForm.value.sentryProjectId || undefined,
      healthCheckUrl: productForm.value.healthCheckUrl || undefined,
      stripeApiKey: productForm.value.stripeApiKey ?? undefined,
      stripeWebhookSecret: productForm.value.stripeWebhookSecret ?? undefined,
      stripeTaxRateId: productForm.value.stripeTaxRateId ?? undefined,
      mixpanelProjectId: productForm.value.mixpanelProjectId || undefined,
      mixpanelRules: this.form()!.buildMixpanelRules(),
      defaultTrialDuration: productForm.value.defaultTrialDuration ?? undefined,
      hasTrialsUsersLimit: !productForm.value.hasTrialsUsersLimit,
      trialsUsersLimit: productForm.value.hasTrialsUsersLimit ? undefined : (productForm.getRawValue().trialsUsersLimit ?? undefined),
      resellerPlansEnabled: productForm.value.resellerPlansEnabled ?? false,
    };

    this._productsService.createProduct(newProduct).subscribe(() => {
      this._productsCacheService.refreshProducts();
      this._router.navigate(['/products']);
    });
  }
}
