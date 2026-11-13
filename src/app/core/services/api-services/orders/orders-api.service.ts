import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CoreAcceptOrderDto,
  CoreConfirmOrderDto,
  CoreCreateOrderDto,
  CoreCustomizationDiscountDto,
  CoreGenerateOfferDto,
  CoreOrdersPageQueryDto,
  CoreOrdersService,
  CoreProvisioningPageQueryDto,
  CoreProvisionLineDto,
  CoreRefuseApprovalDto,
  CoreRefuseOrderDto,
  CoreResponseOrderDto,
  CoreResponseOrderLineDto,
  CoreResponseOrderLinesPageDto,
  CoreResponseOrderSellerDto,
  CoreResponseOrdersPageDto,
  CoreSaveQuotationDto,
  CoreUpdateFinancingDto,
  CoreUpdateOrderDto,
} from '../../../../../../libs/api/src';
import { PageRequest } from '../../../interfaces/page.interface';

/** Filters of the provisioning queue. */
export type ProvisioningFilters = Omit<CoreProvisioningPageQueryDto, 'limit' | 'cursor'>;

/** Filters of the order listing. */
export type OrdersFilters = Omit<CoreOrdersPageQueryDto, 'limit' | 'cursor'>;

/**
 * Wrapper around the generated orders API.
 * Only a draft is edited in place: every later step is an action of its own, with its own checks.
 */
@Injectable({
  providedIn: 'root'
})
export class OrdersApiService {
  /** Core orders service instance. */
  private readonly _coreOrdersService = inject(CoreOrdersService);

  /**
   * Creates an order in draft, with its lines and its customization requests.
   * @param order the order to create.
   * @returns the created order.
   */
  createOrder(order: CoreCreateOrderDto): Observable<CoreResponseOrderDto> {
    return this._coreOrdersService.ordersControllerCreateOrder({ body: order });
  }

  /**
   * Lists one page of the orders, newest first.
   * @param page the page to read.
   * @param filters the filters of the listing.
   * @returns the page of the orders.
   */
  listOrders(page: PageRequest, filters: OrdersFilters): Observable<CoreResponseOrdersPageDto> {
    return this._coreOrdersService.ordersControllerListOrders({ body: { ...page, ...filters } });
  }

  /**
   * Retrieves the orders of a company.
   * @param companyId the identifier of the company.
   * @returns the orders of the company, newest first.
   */
  getOrdersByCompany(companyId: string): Observable<CoreResponseOrderDto[]> {
    return this._coreOrdersService.ordersControllerGetOrdersByCompany({ companyId });
  }

  /**
   * Retrieves who sells to a company: the channel and, on the indirect channel, the enabled products and the margin.
   * @param companyId the identifier of the company.
   * @returns the seller of the company.
   */
  getSeller(companyId: string): Observable<CoreResponseOrderSellerDto> {
    return this._coreOrdersService.ordersControllerGetSeller({ companyId });
  }

  /**
   * Lists one page of the order lines waiting to be provisioned.
   * @param page the page to read.
   * @param filters the filters of the listing.
   * @returns the page of the order lines waiting to be provisioned.
   */
  listProvisioningQueue(page: PageRequest, filters: ProvisioningFilters): Observable<CoreResponseOrderLinesPageDto> {
    return this._coreOrdersService.ordersControllerListProvisioningQueue({ body: { ...page, ...filters } });
  }

  /**
   * Provisions an order line: asks the product for the tenant, then for its users.
   * @param orderId the identifier of the order.
   * @param productId the product of the line.
   * @param provision the tenant and its users, the first being the referent.
   * @returns the line, with the requested tenant.
   */
  provisionLine(orderId: string, productId: string, provision: CoreProvisionLineDto): Observable<CoreResponseOrderLineDto> {
    return this._coreOrdersService.ordersControllerProvisionLine({ id: orderId, productId, body: provision });
  }

  /**
   * Provisions an order line on a tenant the product already has: nothing is asked to the product, the tenant is
   * reactivated if inactive and the new contract is accepted again at the next access.
   * @param orderId the identifier of the order.
   * @param productId the product of the line.
   * @param tenantId the existing tenant.
   * @returns the line, provisioned on the tenant.
   */
  provisionLineOnTenant(orderId: string, productId: string, tenantId: string): Observable<CoreResponseOrderLineDto> {
    return this._coreOrdersService.ordersControllerProvisionLineOnTenant({ id: orderId, productId, body: { tenantId } });
  }

  /**
   * Completes a line whose tenant and users the product has all answered, but which was not recorded as provisioned.
   * @param orderId the identifier of the order.
   * @param productId the product of the line.
   * @returns the line, provisioned.
   */
  completeLineProvisioning(orderId: string, productId: string): Observable<CoreResponseOrderLineDto> {
    return this._coreOrdersService.ordersControllerCompleteLineProvisioning({ id: orderId, productId });
  }

  /**
   * Retrieves an order with its lines and its customization requests.
   * @param id the identifier of the order.
   * @returns the order.
   */
  getOrder(id: string): Observable<CoreResponseOrderDto> {
    return this._coreOrdersService.ordersControllerGetOrder({ id });
  }

  /**
   * Edits a draft order, replacing its code, lines or customization requests.
   * @param id the identifier of the order.
   * @param order the data to apply.
   * @returns the updated order.
   */
  updateOrder(id: string, order: CoreUpdateOrderDto): Observable<CoreResponseOrderDto> {
    return this._coreOrdersService.ordersControllerUpdateOrder({ id, body: order });
  }

  /**
   * Deletes a draft order with its lines and its customization requests.
   * @param id the identifier of the order.
   * @returns the deletion.
   */
  deleteOrder(id: string): Observable<void> {
    return this._coreOrdersService.ordersControllerDeleteOrder({ id });
  }

  /**
   * Sends a draft with customization requests to the back office for pricing.
   * @param id the identifier of the order.
   * @returns the updated order.
   */
  requestQuote(id: string): Observable<CoreResponseOrderDto> {
    return this._coreOrdersService.ordersControllerRequestQuote({ id });
  }

  /**
   * Saves the quotation of an order: the outcome of every customization at once.
   * @param id the identifier of the order.
   * @param quotation the outcome of the customizations.
   * @returns the updated order.
   */
  saveQuotation(id: string, quotation: CoreSaveQuotationDto): Observable<CoreResponseOrderDto> {
    return this._coreOrdersService.ordersControllerSaveQuotation({ id, body: quotation });
  }

  /**
   * Sets the discount the seller grants on a customization.
   * @param id the identifier of the order.
   * @param customizationId the identifier of the customization.
   * @param discount the discount.
   * @returns the updated order.
   */
  setCustomizationDiscount(id: string, customizationId: string, discount: CoreCustomizationDiscountDto): Observable<CoreResponseOrderDto> {
    return this._coreOrdersService.ordersControllerSetCustomizationDiscount({ id, customizationId, body: discount });
  }

  /**
   * Asks the Keus back office to approve the offer of a reseller.
   * @param id the identifier of the order.
   * @returns the updated order.
   */
  requestApproval(id: string): Observable<CoreResponseOrderDto> {
    return this._coreOrdersService.ordersControllerRequestApproval({ id });
  }

  /**
   * Approves the offer of a reseller, which may then generate it.
   * @param id the identifier of the order.
   * @returns the updated order.
   */
  approveOffer(id: string): Observable<CoreResponseOrderDto> {
    return this._coreOrdersService.ordersControllerApproveOffer({ id });
  }

  /**
   * Refuses the approval of the offer of a reseller, with the reason.
   * @param id the identifier of the order.
   * @param refusal the reason of the refusal.
   * @returns the updated order.
   */
  refuseApproval(id: string, refusal: CoreRefuseApprovalDto): Observable<CoreResponseOrderDto> {
    return this._coreOrdersService.ordersControllerRefuseApproval({ id, body: refusal });
  }

  /**
   * Records that the offer has been generated from the template in force and sent.
   * @param id the identifier of the order.
   * @param offer the template the offer was generated from.
   * @returns the updated order.
   */
  generateOffer(id: string, offer: CoreGenerateOfferDto): Observable<CoreResponseOrderDto> {
    return this._coreOrdersService.ordersControllerGenerateOffer({ id, body: offer });
  }

  /**
   * Records the acceptance of the offer with its signed copy.
   * @param id the identifier of the order.
   * @param acceptance the signed offer.
   * @returns the updated order.
   */
  acceptOrder(id: string, acceptance: CoreAcceptOrderDto): Observable<CoreResponseOrderDto> {
    return this._coreOrdersService.ordersControllerAcceptOrder({ id, body: acceptance });
  }

  /**
   * Records the refusal of the offer.
   * @param id the identifier of the order.
   * @param refusal the reason and the note.
   * @returns the updated order.
   */
  refuseOrder(id: string, refusal: CoreRefuseOrderDto): Observable<CoreResponseOrderDto> {
    return this._coreOrdersService.ordersControllerRefuseOrder({ id, body: refusal });
  }

  /**
   * Marks an order of the direct channel as financed, or removes the financing.
   * @param id the identifier of the order.
   * @param financing the financing data.
   * @returns the updated order.
   */
  updateFinancing(id: string, financing: CoreUpdateFinancingDto): Observable<CoreResponseOrderDto> {
    return this._coreOrdersService.ordersControllerUpdateFinancing({ id, body: financing });
  }

  /**
   * Confirms an accepted order with the expected delivery date.
   * @param id the identifier of the order.
   * @param confirmation the expected delivery date.
   * @returns the updated order.
   */
  confirmOrder(id: string, confirmation: CoreConfirmOrderDto): Observable<CoreResponseOrderDto> {
    return this._coreOrdersService.ordersControllerConfirmOrder({ id, body: confirmation });
  }

  /**
   * Cancels an order before its confirmation.
   * @param id the identifier of the order.
   * @returns the updated order.
   */
  cancelOrder(id: string): Observable<CoreResponseOrderDto> {
    return this._coreOrdersService.ordersControllerCancelOrder({ id });
  }
}
