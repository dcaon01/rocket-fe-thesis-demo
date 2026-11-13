import { inject, Injectable } from '@angular/core';
import { CoreCompaniesPageQueryDto, CoreCompaniesService, CoreCreateCompanyDto, CoreResponseCompaniesPageDto, CoreResponseCompanyDto, CoreTransferCompanyDto, CoreUpdateCompanyDto } from '../../../../../../libs/api/src';
import { PageRequest } from '../../../interfaces/page.interface';
import { Observable } from 'rxjs';

/** Filters of the company listing. */
export type CompaniesFilters = Omit<CoreCompaniesPageQueryDto, 'limit' | 'cursor'>;

@Injectable({
  providedIn: 'root'
})
export class CompaniesApiService {
  /** Companies Service. */
  private readonly _companiesService = inject(CoreCompaniesService);

  /**
   * Get all companies.
   * @return An observable of company array.
   */
  createCompany(company: CoreCreateCompanyDto): Observable<CoreResponseCompanyDto> {
    return this._companiesService.companiesControllerCreateCompany({ body: company });
  }

  /**
   * Update a company by id.
   * @param id the identifier of the company to update.
   * @return An observable of the updated company.
   */
  updateCompany(id: string, company: CoreUpdateCompanyDto): Observable<CoreResponseCompanyDto> {
    return this._companiesService.companiesControllerUpdateCompany({ id, body: company });
  }

  /**
   * Get a company by id.
   * @param id the identifier of the company to retrieve.
   * @return An observable of the company.
   */
  getCompany(id: string): Observable<CoreResponseCompanyDto> {
    return this._companiesService.companiesControllerGetCompany({ id });
  }

  /**
   * Lists one page of the companies visible to the user.
   * @param page the page to read.
   * @param filters the filters of the listing.
   * @returns the page of the companies visible to the user.
   */
  listCompanies(page: PageRequest, filters: CompaniesFilters): Observable<CoreResponseCompaniesPageDto> {
    return this._companiesService.companiesControllerListCompanies({ body: { ...page, ...filters } });
  }

  /**
   * Transfers a company of an inactive reseller to another active reseller, or to Keus when no reseller is given.
   * @param id the identifier of the company to transfer.
   * @param transfer the reseller the company moves to, or the plans of the direct contracts towards Keus.
   * @returns the company on its new channel.
   */
  transferCompany(id: string, transfer: CoreTransferCompanyDto): Observable<CoreResponseCompanyDto> {
    return this._companiesService.companiesControllerTransferCompany({ id, body: transfer });
  }

  /**
   * Delete a company by id.
   * @param id the identifier of the company to delete.
   */
  deleteCompany(id: string): Observable<void> {
    return this._companiesService.companiesControllerDeleteCompany({ id });
  }
}
