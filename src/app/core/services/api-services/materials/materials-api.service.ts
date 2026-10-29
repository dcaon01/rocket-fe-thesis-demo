import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CoreAvailableMaterialsPageQueryDto,
  CoreCreateMaterialDto,
  CoreMaterialsPageQueryDto,
  CoreMaterialsService,
  CoreResponseMaterialDto,
  CoreResponseMaterialsPageDto,
  CoreResponseResellerDto,
  CoreUpdateMaterialDto,
} from '../../../../../../libs/api/src';
import { PageRequest } from '../../../interfaces/page.interface';

/** Filters of the materials a reseller can see, with the product, tier and reseller to preview. */
export type AvailableMaterialsFilters = Omit<CoreAvailableMaterialsPageQueryDto, 'limit' | 'cursor'>;

/** Filters of the material catalogue. */
export type MaterialsFilters = Omit<CoreMaterialsPageQueryDto, 'limit' | 'cursor'>;

/** Reseller tier a material can be previewed for. */
export type MaterialTier = NonNullable<CoreResponseResellerDto['tier']>;

/**
 * Wrapper around the generated materials API.
 * The file is attached after creation: upload it under the material's key, then update the material with the key.
 */
@Injectable({
  providedIn: 'root'
})
export class MaterialsApiService {
  /** Core materials service instance. */
  private readonly _coreMaterialsService = inject(CoreMaterialsService);

  /**
   * Creates a material in draft.
   * @param material the material to create.
   * @returns the created material.
   */
  createMaterial(material: CoreCreateMaterialDto): Observable<CoreResponseMaterialDto> {
    return this._coreMaterialsService.materialsControllerCreateMaterial({ body: material });
  }

  /**
   * Lists one page of the material catalogue, newest first.
   * @param page the page to read.
   * @param filters the filters of the listing.
   * @returns the page of the material catalogue.
   */
  listMaterials(page: PageRequest, filters: MaterialsFilters): Observable<CoreResponseMaterialsPageDto> {
    return this._coreMaterialsService.materialsControllerListMaterials({ body: { ...page, ...filters } });
  }

  /**
   * Lists one page of the published materials a reseller can see, newest first.
   * @param page the page to read.
   * @param filters the filters of the listing.
   * @returns the page of the published materials a reseller can see.
   */
  listAvailableMaterials(page: PageRequest, filters: AvailableMaterialsFilters): Observable<CoreResponseMaterialsPageDto> {
    return this._coreMaterialsService.materialsControllerListAvailableMaterials({ body: { ...page, ...filters } });
  }

  /**
   * Retrieves a material by id.
   * @param id the identifier of the material.
   * @returns the material.
   */
  getMaterial(id: string): Observable<CoreResponseMaterialDto> {
    return this._coreMaterialsService.materialsControllerGetMaterial({ id });
  }

  /**
   * Updates a material, in any state.
   * @param id the identifier of the material.
   * @param material the data to apply.
   * @returns the updated material.
   */
  updateMaterial(id: string, material: CoreUpdateMaterialDto): Observable<CoreResponseMaterialDto> {
    return this._coreMaterialsService.materialsControllerUpdateMaterial({ id, body: material });
  }

  /**
   * Publishes a material, making it visible to the resellers it is assigned to.
   * @param id the identifier of the material.
   * @returns the published material.
   */
  publishMaterial(id: string): Observable<CoreResponseMaterialDto> {
    return this._coreMaterialsService.materialsControllerPublishMaterial({ id });
  }

  /**
   * Withdraws a material from the resellers' view.
   * @param id the identifier of the material.
   * @returns the withdrawn material.
   */
  withdrawMaterial(id: string): Observable<CoreResponseMaterialDto> {
    return this._coreMaterialsService.materialsControllerWithdrawMaterial({ id });
  }

  /**
   * Deletes a material that is not published, together with its file.
   * @param id the identifier of the material.
   */
  deleteMaterial(id: string): Observable<void> {
    return this._coreMaterialsService.materialsControllerDeleteMaterial({ id });
  }
}
