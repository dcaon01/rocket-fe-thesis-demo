import { Component, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { finalize, switchMap } from 'rxjs';
import { CoreStructureField, CoreUpdateProductDto } from '../../../../../../../libs/api/src';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { TypeEnum } from '../../../../enums/type.enum';
import { ProductsApiService } from '../../../../services/api-services/products/products-api.service';
import { S3UploadService } from '../../../../services/api-services/s3/s3-upload.service';
import { ProductsCacheService } from '../../../../services/cache/products-cache.service';
import { ProductFormComponent } from '../../components/product-form/product-form.component';
import { CreateEditProductForm } from '../../interfaces/create-edit-product-form.interface';

@Component({
  selector: 'rocket-products-edit',
  imports: [
    ...HlmButtonImports,
    ...HlmTooltipImports,
    PageHeaderComponent,
    ProductFormComponent
  ],
  templateUrl: './products-edit.component.html',
  styleUrl: './products-edit.component.css'
})
export class ProductsEditComponent {
  /** Products api service. */
  private readonly _productService = inject(ProductsApiService);

  /** Products cache service. */
  private readonly _productsCacheService = inject(ProductsCacheService);

  /** S3 upload service. */
  private readonly _s3UploadService = inject(S3UploadService);

  /** Activated route. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** Router service. */
  private readonly _router = inject(Router);

  /** View child reference to the product form component. */
  form = viewChild<ProductFormComponent>('form');

  /** Signal to hold product data for editing. */
  readonly productData = toSignal(
    this._productService.getProduct(this._activatedRoute.snapshot.params['productId'])
  );

  /**
   * Uploads the logo as soon as it is chosen and saves its key on the product.
   * @param file the selected logo file.
   */
  onLogoSelected(file: File): void {
    const productId = this.productData()?.id;
    if (!productId) return;

    this.form()?.setLogoUploadingState(true);
    this._s3UploadService.uploadProductLogo(productId, file).pipe(
      switchMap(logoS3Key => this._productService.updateProduct(productId, { logoS3Key })),
      finalize(() => this.form()?.setLogoUploadingState(false))
    ).subscribe({
      next: () => this._productsCacheService.refreshProducts(),
      error: () => this.form()?.logoUploadFailed(),
    });
  }

  /**
   * Method to handle product editing logic.
   * @param productForm the product form data got from the child form component.
   */
  editProduct(productForm: FormGroup<CreateEditProductForm>) {
    const productId = this.productData()?.id ?? '';

    // Nothing to save
    if (!productForm.dirty) {
      return;
    }

    // Build update DTO with only dirty fields.
    const updateProduct: CoreUpdateProductDto = {};

    if (productForm.get('name')?.dirty) updateProduct.name = productForm.value.name ?? undefined;
    if (productForm.get('prefix')?.dirty) updateProduct.prefix = productForm.value.prefix ?? undefined;
    if (productForm.get('description')?.dirty) updateProduct.description = productForm.value.description || null;
    if (productForm.get('hubspotSolution')?.dirty) updateProduct.hubspotSolution = productForm.value.hubspotSolution || null;
    if (productForm.get('intercomBrand')?.dirty) updateProduct.intercomBrand = productForm.value.intercomBrand || null;
    if (productForm.get('sentryProjectId')?.dirty) updateProduct.sentryProjectId = productForm.value.sentryProjectId || null;
    if (productForm.get('healthCheckUrl')?.dirty) updateProduct.healthCheckUrl = productForm.value.healthCheckUrl || null;
    if (productForm.get('customAttributes')?.dirty) updateProduct.customAttributes = productForm.value.customAttributes || [];
    if (productForm.get('roles')?.dirty) updateProduct.roles = productForm.value.roles || [];
    if (productForm.get('status')?.dirty) updateProduct.status = productForm.value.status ?? undefined;
    if (productForm.get('domain')?.dirty) updateProduct.domain = productForm.value.domain || null;

    if ((productForm.get('tenantStructure') as FormArray).dirty) {
      const tenantStructure: CoreStructureField[] = [];
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
      updateProduct.tenantStructure = tenantStructure;
    }

    if ((productForm.get('userStructure') as FormArray).dirty) {
      const userStructure: CoreStructureField[] = [];
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
      updateProduct.userStructure = userStructure;
    }

    if (productForm.controls.mixpanelRules.dirty) {
      updateProduct.mixpanelRules = this.form()!.buildMixpanelRules();
    }

    if (productForm.get('stripeApiKey')?.dirty) updateProduct.stripeApiKey = productForm.value.stripeApiKey || null;
    if (productForm.get('stripeWebhookSecret')?.dirty) updateProduct.stripeWebhookSecret = productForm.value.stripeWebhookSecret || null;
    if (productForm.get('stripeTaxRateId')?.dirty) updateProduct.stripeTaxRateId = productForm.value.stripeTaxRateId || null;
    if (productForm.get('mixpanelProjectId')?.dirty) updateProduct.mixpanelProjectId = productForm.value.mixpanelProjectId || null;

    if (productForm.get('defaultTrialDuration')?.dirty) updateProduct.defaultTrialDuration = productForm.value.defaultTrialDuration ?? null;
    if (productForm.get('hasTrialsUsersLimit')?.dirty || productForm.get('trialsUsersLimit')?.dirty) {
      updateProduct.hasTrialsUsersLimit = !productForm.value.hasTrialsUsersLimit;
      updateProduct.trialsUsersLimit = productForm.value.hasTrialsUsersLimit ? null : (productForm.getRawValue().trialsUsersLimit ?? undefined);
    }

    if (productForm.get('resellerPlansEnabled')?.dirty) updateProduct.resellerPlansEnabled = productForm.value.resellerPlansEnabled ?? false;

    this._productService.updateProduct(productId, updateProduct).pipe(
      finalize(() => {
        this._productsCacheService.refreshProducts();
        this._router.navigate(['/products']);
      })
    ).subscribe();
  }
}
