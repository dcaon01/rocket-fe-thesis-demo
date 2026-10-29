import { inject, Injectable } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { CoreCreateResellerContractDto, CoreResellerContractsPageQueryDto, CoreResellerContractsService, CoreResponseResellerAccessDto, CoreResponseResellerContractDto, CoreResponseResellerContractsPageDto, CoreUpdateResellerContractDto } from '../../../../../../libs/api/src';
import { PageRequest } from '../../../interfaces/page.interface';
import { ToasterService } from '../../toaster/toaster.service';

/** Filters of the reseller contract listing. */
export type ResellerContractsFilters = Omit<CoreResellerContractsPageQueryDto, 'limit' | 'cursor'>;

/**
 * Wrapper of the API of the contracts between Keus and its resellers.
 */
@Injectable({
  providedIn: 'root'
})
export class ResellerContractsApiService {
  /** Reseller contracts service. */
  private readonly _resellerContractsService = inject(CoreResellerContractsService);

  /** Toaster service instance, for the document that cannot be generated: the interceptor does not report a failed read. */
  private readonly _toasterService = inject(ToasterService);

  /**
   * Lists one page of the contracts of every reseller.
   * @param page the page to read.
   * @param filters the filters of the listing.
   * @returns the page of the contracts of every reseller.
   */
  listContracts(page: PageRequest, filters: ResellerContractsFilters): Observable<CoreResponseResellerContractsPageDto> {
    return this._resellerContractsService.resellerContractsControllerListContracts({ body: { ...page, ...filters } });
  }

  /**
   * Get the contracts of a reseller, the newest start date first.
   * @param resellerId the identifier of the reseller.
   * @return An observable of the contracts.
   */
  getContracts(resellerId: string): Observable<CoreResponseResellerContractDto[]> {
    return this._resellerContractsService.resellerContractsControllerGetContracts({ resellerId });
  }

  /**
   * Get the contract in force of a reseller.
   * @param resellerId the identifier of the reseller.
   * @return An observable of the contract in force.
   */
  getContractInForce(resellerId: string): Observable<CoreResponseResellerContractDto> {
    return this._resellerContractsService.resellerContractsControllerGetContractInForce({ resellerId });
  }

  /**
   * Get a contract of a reseller.
   * @param resellerId the identifier of the reseller.
   * @param id the identifier of the contract.
   * @return An observable of the contract.
   */
  getContract(resellerId: string, id: string): Observable<CoreResponseResellerContractDto> {
    return this._resellerContractsService.resellerContractsControllerGetContract({ resellerId, id });
  }

  /**
   * Generates the document of a draft contract from the published template.
   * @param resellerId the identifier of the reseller.
   * @param id the identifier of the contract.
   * @returns the URL of the document.
   */
  getContractDocumentUrl(resellerId: string, id: string): Observable<string> {
    return this._resellerContractsService.resellerContractsControllerGetContractDocument({ resellerId, id }).pipe(
      map(response => response.url),
      tap({ error: () => this._toasterService.showError('Non è stato possibile generare il contratto.') }),
    );
  }

  /**
   * Generates the checkout that collects the SEPA mandate of a reseller on the account of a product of its contract.
   * @param resellerId the identifier of the reseller.
   * @param id the identifier of the contract, the one in force.
   * @param accountKey the product whose Stripe account collects.
   * @returns an observable of the contract with the checkout link.
   */
  createMandateCheckout(resellerId: string, id: string, accountKey: string): Observable<CoreResponseResellerContractDto> {
    return this._resellerContractsService.resellerContractsControllerCreateMandateCheckout({ resellerId, id, accountKey });
  }

  /**
   * Tells whether the users of a reseller can work in Rocket, and what the activation or the payment still waits for.
   * @param resellerId the identifier of the reseller.
   * @returns an observable of the access state.
   */
  getAccess(resellerId: string): Observable<CoreResponseResellerAccessDto> {
    return this._resellerContractsService.resellerContractsControllerGetAccess({ resellerId });
  }

  /**
   * Open a contract with a reseller from its partner tier.
   * @param resellerId the identifier of the reseller.
   * @param contract the tier and the terms negotiated apart from it.
   * @return An observable of the contract created, as a draft.
   */
  createContract(resellerId: string, contract: CoreCreateResellerContractDto): Observable<CoreResponseResellerContractDto> {
    return this._resellerContractsService.resellerContractsControllerCreateContract({ resellerId, body: contract });
  }

  /**
   * Update a reseller contract: a status change, or the terms of a draft.
   * @param resellerId the identifier of the reseller.
   * @param id the identifier of the contract.
   * @param contract the change to apply.
   * @return An observable of the updated contract.
   */
  updateContract(resellerId: string, id: string, contract: CoreUpdateResellerContractDto): Observable<CoreResponseResellerContractDto> {
    return this._resellerContractsService.resellerContractsControllerUpdateContract({ resellerId, id, body: contract });
  }

  /**
   * Refresh the expired checkout session of a signed reseller contract.
   * @param resellerId the identifier of the reseller.
   * @param id the identifier of the contract.
   * @return An observable of the contract with the new checkout session.
   */
  refreshCheckoutSession(resellerId: string, id: string): Observable<CoreResponseResellerContractDto> {
    return this._resellerContractsService.resellerContractsControllerRefreshCheckoutSession({ resellerId, id });
  }

  /**
   * Delete a draft reseller contract.
   * @param resellerId the identifier of the reseller.
   * @param id the identifier of the contract.
   * @return An observable completing when the contract is deleted.
   */
  deleteContract(resellerId: string, id: string): Observable<void> {
    return this._resellerContractsService.resellerContractsControllerDeleteContract({ resellerId, id });
  }
}
