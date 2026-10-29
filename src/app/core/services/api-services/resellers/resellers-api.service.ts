import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CoreCreateResellerDto, CoreResellersPageQueryDto, CoreResellersService, CoreResponseResellerDto, CoreResponseResellersPageDto, CoreResponseResellerTierConfigDto, CoreUpdateResellerDto, CoreUpsertResellerTierConfigDto } from '../../../../../../libs/api/src';
import { PageRequest } from '../../../interfaces/page.interface';

/** Filters of the reseller listing. */
export type ResellersFilters = Omit<CoreResellersPageQueryDto, 'limit' | 'cursor'>;

@Injectable({
  providedIn: 'root'
})
export class ResellersApiService {
  /** Resellers Service. */
  private readonly _resellersService = inject(CoreResellersService);

  /**
   * Create a reseller.
   * @param reseller the reseller to create.
   * @return An observable of the created reseller.
   */
  createReseller(reseller: CoreCreateResellerDto): Observable<CoreResponseResellerDto> {
    return this._resellersService.resellersControllerCreateReseller({ body: reseller });
  }

  /**
   * Update a reseller by id.
   * @param id the identifier of the reseller to update.
   * @return An observable of the updated reseller.
   */
  updateReseller(id: string, reseller: CoreUpdateResellerDto): Observable<CoreResponseResellerDto> {
    return this._resellersService.resellersControllerUpdateReseller({ id, body: reseller });
  }

  /**
   * Get a reseller by id.
   * @param id the identifier of the reseller to retrieve.
   * @return An observable of the reseller.
   */
  getReseller(id: string): Observable<CoreResponseResellerDto> {
    return this._resellersService.resellersControllerGetReseller({ id });
  }

  /**
   * Gives Rocket back to the users of a reseller blocked for an unpaid invoice, before the money arrives.
   * @param id the identifier of the reseller.
   * @returns an observable of the reseller.
   */
  restoreAccess(id: string): Observable<CoreResponseResellerDto> {
    return this._resellersService.resellersControllerRestoreAccess({ id });
  }

  /**
   * Get a reseller by its code.
   * @param code the code of the reseller to retrieve.
   * @return An observable of the reseller.
   */
  getResellerByCode(code: string): Observable<CoreResponseResellerDto> {
    return this._resellersService.resellersControllerGetResellerByCode({ code });
  }

  /**
   * Lists one page of the resellers visible to the user.
   * @param page the page to read.
   * @param filters the filters of the listing.
   * @returns the page of the resellers visible to the user.
   */
  listResellers(page: PageRequest, filters: ResellersFilters): Observable<CoreResponseResellersPageDto> {
    return this._resellersService.resellersControllerListResellers({ body: { ...page, ...filters } });
  }

  /**
   * Delete a reseller by id.
   * @param id the identifier of the reseller to delete.
   */
  deleteReseller(id: string): Observable<void> {
    return this._resellersService.resellersControllerDeleteReseller({ id });
  }

  /**
   * Get the configuration of every commercial tier.
   * @return An observable of the tier configurations.
   */
  getTierConfigs(): Observable<CoreResponseResellerTierConfigDto[]> {
    return this._resellersService.resellersControllerGetTierConfigs();
  }

  /**
   * Set the configuration of a commercial tier.
   * @param tier the tier to configure.
   * @param config the fee plan, the fee discounts and the three discounts to write.
   * @return An observable of the written configuration.
   */
  upsertTierConfig(tier: 'SILVER' | 'GOLD' | 'PLATINUM', config: CoreUpsertResellerTierConfigDto): Observable<CoreResponseResellerTierConfigDto> {
    return this._resellersService.resellersControllerUpsertTierConfig({ tier, body: config });
  }
}
