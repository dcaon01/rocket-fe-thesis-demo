import { Component, inject, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { CoreCreateMaterialDto } from '../../../../../../../libs/api/src';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { MaterialType } from '../../../../enums/material-type.enum';
import { MaterialsApiService } from '../../../../services/api-services/materials/materials-api.service';
import { MaterialFormComponent } from '../../components/material-form/material-form.component';
import { FormToolbarComponent } from '../../../../components/form-toolbar/form-toolbar.component';

/**
 * Page that creates a sales material in draft.
 * The file is attached afterwards, from the material page the creation leads to.
 */
@Component({
  selector: 'rocket-materials-create',
  imports: [
    ...HlmButtonImports,
    ...HlmTooltipImports,
    PageHeaderComponent,
    MaterialFormComponent,
    FormToolbarComponent,
  ],
  templateUrl: './materials-create.component.html',
})
export class MaterialsCreateComponent {
  /** Router instance. */
  private readonly _router = inject(Router);

  /** Activated route instance. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** Materials API service instance. */
  private readonly _materialsApiService = inject(MaterialsApiService);

  /** View child reference to the material form component. */
  form = viewChild<MaterialFormComponent>('form');

  /**
   * Creates the material and opens it, where the file is attached.
   */
  createMaterial(): void {
    const value = this.form()?.materialForm.getRawValue();
    if (!value) return;

    const materialDto: CoreCreateMaterialDto = {
      title: value.title!,
      description: value.description!,
      type: value.type!,
      ...(value.type === MaterialType.ExternalLink && value.externalUrl ? { externalUrl: value.externalUrl } : {}),
      ...(value.productIds?.length ? { productIds: value.productIds } : {}),
      ...(value.resellerTiers?.length ? { resellerTiers: value.resellerTiers } : {}),
    };

    this._materialsApiService.createMaterial(materialDto).subscribe(material => {
      this._router.navigate(['../edit', material.id], { relativeTo: this._activatedRoute });
    });
  }
}
