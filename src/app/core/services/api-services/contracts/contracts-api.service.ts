import { inject, Injectable } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { CoreContractsPageQueryDto, CoreContractsService, CoreResponseContractDto, CoreResponseContractsPageDto } from '../../../../../../libs/api/src';
import { PageRequest } from '../../../interfaces/page.interface';
import { ToasterService } from '../../toaster/toaster.service';

/** Filters of the contract listing, with the product. */
export type ContractsFilters = Omit<CoreContractsPageQueryDto, 'limit' | 'cursor'> & { productId: string };

/**
 * Wrapper of the contracts API: reads, cancellation, termination and the document of a contract.
 */
@Injectable({
  providedIn: 'root'
})
export class ContractsApiService {
  /** Core contracts service instance. */
  private readonly _coreContractsService = inject(CoreContractsService);

  /** Toaster service instance, for the document link that cannot be signed: the interceptor does not report a failed read. */
  private readonly _toasterService = inject(ToasterService);

  /**
   * Retrieves all the contracts in Rocket.
   * @returns all the contracts in Rocket.
   */
  getAllContracts(): Observable<CoreResponseContractDto[]> {
    return this._coreContractsService.contractsControllerGetAllContracts({});
  }

  /**
   * Lists one page of the contracts of a product.
   * @param page the page to read.
   * @param filters the filters of the listing.
   * @returns the page of the contracts of a product.
   */
  listContracts(page: PageRequest, filters: ContractsFilters): Observable<CoreResponseContractsPageDto> {
    const { productId, ...rest } = filters;
    return this._coreContractsService.contractsControllerListContracts({ productId, body: { ...page, ...rest } });
  }

  /**
   * Retrieves the contracts of a company, terminated ones included.
   * @param companyId the identifier of the company.
   * @returns the contracts of the company.
   */
  getContractsByCompany(companyId: string): Observable<CoreResponseContractDto[]> {
    return this._coreContractsService.contractsControllerGetContractsByCompany({ companyId });
  }

  /**
   * Retrieves a contract.
   * @param productId the identifier of the product.
   * @param id the identifier of the contract.
   * @returns the contract with the specified id.
   */
  getContract(productId: string, id: string): Observable<CoreResponseContractDto> {
    return this._coreContractsService.contractsControllerGetContract({ productId, id });
  }

  /**
   * Signs a short-lived link to the document of a contract.
   * @param productId the identifier of the product.
   * @param id the identifier of the contract.
   * @returns the URL of the document.
   */
  getDocumentUrl(productId: string, id: string): Observable<string> {
    return this._coreContractsService.contractsControllerGetDocumentUrl({ productId, id }).pipe(
      map(response => response.url),
      tap({ error: () => this._toasterService.showError('Non è stato possibile aprire il documento del contratto.') }),
    );
  }

  /**
   * Generates the checkout that collects the SEPA mandate of the company, or returns the one still valid.
   * @param productId the identifier of the product.
   * @param id the identifier of the contract.
   * @returns the contract with the checkout link.
   */
  createMandateCheckout(productId: string, id: string): Observable<CoreResponseContractDto> {
    return this._coreContractsService.contractsControllerCreateMandateCheckout({ productId, id });
  }

  /**
   * Records the cancellation of a contract.
   * @param productId the identifier of the product.
   * @param id the identifier of the contract.
   * @returns the contract, now terminating.
   */
  terminateAtRenewal(productId: string, id: string): Observable<CoreResponseContractDto> {
    return this._coreContractsService.contractsControllerTerminateAtRenewal({ productId, id });
  }

  /**
   * Withdraws the cancellation of a contract.
   * @param productId the identifier of the product.
   * @param id the identifier of the contract.
   * @returns the contract, active again.
   */
  withdrawTermination(productId: string, id: string): Observable<CoreResponseContractDto> {
    return this._coreContractsService.contractsControllerWithdrawTermination({ productId, id });
  }

  /**
   * Terminates a contract at once.
   * @param productId the identifier of the product.
   * @param id the identifier of the contract.
   * @returns the terminated contract.
   */
  terminateNow(productId: string, id: string): Observable<CoreResponseContractDto> {
    return this._coreContractsService.contractsControllerTerminateNow({ productId, id });
  }

  /**
   * Suspends by hand the access of a contract.
   * @param productId the identifier of the product.
   * @param id the identifier of the contract.
   * @returns the contract.
   */
  suspendAccess(productId: string, id: string): Observable<CoreResponseContractDto> {
    return this._coreContractsService.contractsControllerSuspendAccess({ productId, id });
  }

  /**
   * Restores by hand the access of a contract suspended for an unpaid invoice.
   * @param productId the identifier of the product.
   * @param id the identifier of the contract.
   * @returns the contract.
   */
  restoreAccess(productId: string, id: string): Observable<CoreResponseContractDto> {
    return this._coreContractsService.contractsControllerRestoreAccess({ productId, id });
  }

  /**
   * Postpones the suspension of the access of a contract to a date.
   * @param productId the identifier of the product.
   * @param id the identifier of the contract.
   * @param until the date the suspension waits for (ISO).
   * @returns the updated contract.
   */
  postponeSuspension(productId: string, id: string, until: string): Observable<CoreResponseContractDto> {
    return this._coreContractsService.contractsControllerPostponeSuspension({ productId, id, body: { until } });
  }
}
