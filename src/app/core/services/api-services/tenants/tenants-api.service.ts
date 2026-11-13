import { inject, Injectable } from '@angular/core';
import { CoreCreateTenantDto, CoreResponsePendingOperationDto, CoreResponseTenantDto, CoreResponseTenantsPageDto, CoreTenantsPageQueryDto, CoreTenantsService } from '../../../../../../libs/api/src';
import { PageRequest } from '../../../interfaces/page.interface';
import { Observable } from 'rxjs';

/** Filters of the tenant listing, with the product. */
export type TenantsFilters = Omit<CoreTenantsPageQueryDto, 'limit' | 'cursor'> & { productId: string };

@Injectable({
  providedIn: 'root'
})
export class TenantsApiService {
  /** Core tenants service instance. */
  private readonly _coreTenantsService = inject(CoreTenantsService);

  /**
   * Fetches all tenants in Rocket.
   * @returns all the tenants in Rocket.
   */
  getAllTenants(): Observable<CoreResponseTenantDto[]> {
    return this._coreTenantsService.tenantsControllerGetAllTenants({});
  }

  /**
   * Lists one page of the tenants of a product.
   * @param page the page to read.
   * @param filters the filters of the listing.
   * @returns the page of the tenants of a product.
   */
  listTenants(page: PageRequest, filters: TenantsFilters): Observable<CoreResponseTenantsPageDto> {
    const { productId, ...rest } = filters;
    return this._coreTenantsService.tenantsControllerListTenants({ productId, body: { ...page, ...rest } });
  }

  /**
   * Retrieves the tenants of a company on every product, those of terminated contracts included.
   * @param companyId the identifier of the company.
   * @returns the tenants of the company.
   */
  getTenantsByCompany(companyId: string): Observable<CoreResponseTenantDto[]> {
    return this._coreTenantsService.tenantsControllerGetTenantsByCompany({ companyId });
  }

  /**
   * Fetch a tenant.
   * @param productId the identifier of the product. 
   * @param id the identifier of the tenant.
   * @returns the tenant with the specified id.
   */
  getTenant(productId: string, id: string): Observable<CoreResponseTenantDto> {
    return this._coreTenantsService.tenantsControllerGetTenant({ productId, id });
  }

  /**
   * Creates a new tenant.
   * @param tenant the tenant to be created.
   * @returns the created tenant.
   */
  createTenant(tenant: CoreCreateTenantDto): Observable<CoreResponseTenantDto> {
    return this._coreTenantsService.tenantsControllerCreateTenant({ body: tenant });
  }

  /**
   * Updates an existing tenant.
   * @param productId the identifier of the product.
   * @param id the identifier of the tenant.
   * @param tenant the updated tenant data.
   * @returns the updated tenant.
   */
  updateTenant(productId: string, id: string, tenant: Partial<CoreCreateTenantDto>): Observable<CoreResponseTenantDto> {
    return this._coreTenantsService.tenantsControllerUpdateTenant({ productId, id, body: tenant });
  }

  /**
   * Sends the open operation of a tenant to the product again.
   * @param productId the identifier of the product.
   * @param id the identifier of the tenant.
   * @returns the tenant, waiting for the product.
   */
  resendTenantRequest(productId: string, id: string): Observable<CoreResponseTenantDto> {
    return this._coreTenantsService.tenantsControllerResendTenantRequest({ productId, id });
  }

  /**
   * Discards an operation of a tenant the product answered with an error.
   * @param productId the identifier of the product.
   * @param id the identifier of the tenant.
   * @returns the tenant.
   */
  cancelTenantRequest(productId: string, id: string): Observable<CoreResponseTenantDto> {
    return this._coreTenantsService.tenantsControllerCancelTenantRequest({ productId, id });
  }

  /**
   * Asks the product to delete a tenant: it becomes deleted when the product confirms.
   * @param productId the identifier of the product.
   * @param id the identifier of the tenant.
   * @returns the tenant, waiting for the product.
   */
  deleteTenant(productId: string, id: string): Observable<CoreResponseTenantDto> {
    return this._coreTenantsService.tenantsControllerDeleteTenant({ productId, id });
  }

  /**
   * Removes for good a deleted tenant, or a discarded request, with its users.
   * @param productId the identifier of the product.
   * @param id the identifier of the tenant.
   */
  purgeTenant(productId: string, id: string): Observable<void> {
    return this._coreTenantsService.tenantsControllerPurgeTenant({ productId, id });
  }

  /**
   * Lists the operations sent to the product for a tenant, oldest first.
   * @param productId the identifier of the product.
   * @param id the identifier of the tenant.
   * @returns the operations of the tenant.
   */
  listTenantOperations(productId: string, id: string): Observable<CoreResponsePendingOperationDto[]> {
    return this._coreTenantsService.tenantsControllerListTenantOperations({ productId, id });
  }
}
