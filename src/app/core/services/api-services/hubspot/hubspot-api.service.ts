import { inject, Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import {
  CoreHubspotService,
  CoreResponseHubspotCompanyDto,
  CoreResponseHubspotContactDto,
  CoreResponseHubspotDealDetailedDto,
  CoreResponseHubspotDealDto,
  CoreResponseHubspotLinkDto,
} from '../../../../../../libs/api/src';

@Injectable({
  providedIn: 'root'
})
export class HubspotApiService {
  /** HubSpot service instance. */
  private readonly _hubspotService = inject(CoreHubspotService);

  /**
   * Retrieves all the 'closedwon' deals from HubSpot for a specific product.
   * @param productId the identifier of the product.
   */
  getClosedWonDeals(productId: string): Observable<CoreResponseHubspotDealDto[]> {
    return this._hubspotService.hubspotControllerGetHubspotClosedWonDeals({ productId });
  }

  /**
   * Retrieves a single HubSpot deal with associated contact and company information.
   * @param productId the identifier of the product.
   * @param dealId the HubSpot deal ID.
   */
  getDealById(productId: string, dealId: string): Observable<CoreResponseHubspotDealDetailedDto> {
    return this._hubspotService.hubspotControllerGetHubspotDealById({ productId, dealId });
  }

  /**
   * Retrieves a single HubSpot contact with all available properties.
   * @param productId the identifier of the product.
   * @param contactId the HubSpot contact ID.
   */
  getContactById(productId: string, contactId: string): Observable<CoreResponseHubspotContactDto> {
    return this._hubspotService.hubspotControllerGetHubspotContactById({ productId, contactId });
  }

  /**
   * Retrieves a single HubSpot company with all available properties.
   * @param productId the identifier of the product.
   * @param companyId the HubSpot company ID.
   */
  getCompanyById(productId: string, companyId: string): Observable<CoreResponseHubspotCompanyDto> {
    return this._hubspotService.hubspotControllerGetHubspotCompanyById({ productId, companyId });
  }

  /** Link to the products pipeline, read once per session: it does not change. */
  private readonly _dealsPipelineLink$ = this._hubspotService.hubspotControllerGetDealsPipelineLink().pipe(shareReplay(1));

  /**
   * Retrieves the link that opens the products pipeline on HubSpot, with one request per session.
   */
  getDealsPipelineLink(): Observable<CoreResponseHubspotLinkDto> {
    return this._dealsPipelineLink$;
  }
}
