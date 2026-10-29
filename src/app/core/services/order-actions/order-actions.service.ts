import { inject, Injectable } from '@angular/core';
import { CoreResponseOrderDto } from '../../../../../libs/api/src';
import { Capability } from '../../enums/capability.enum';
import { OrderStatus } from '../../enums/order-status.enum';
import { SalesChannel } from '../../enums/sales-channel.enum';
import { PermissionsService } from '../permissions/permissions.service';

/** Actions of the order that go through the action dialog; each shows its own fields. */
export type OrderActionKind =
  | 'requestQuote'
  | 'saveQuotation'
  | 'discountCustomization'
  | 'requestApproval'
  | 'approve'
  | 'refuseApproval'
  | 'offer'
  | 'accept'
  | 'refuse'
  | 'financing'
  | 'confirm'
  | 'completeProvisioning'
  | 'cancel';

/** Steps that move the whole order, offered in its menu and in the row of the list. */
export type OrderStepKind = Extract<OrderActionKind,
  'requestQuote' | 'requestApproval' | 'approve' | 'refuseApproval' | 'offer' | 'accept' | 'refuse' | 'financing' | 'confirm' | 'cancel'>;

/** Label and icon of each step, for the buttons and their tooltips. */
export const ORDER_STEPS: Record<OrderStepKind, { label: string; icon: string }> = {
  requestQuote: { label: 'Richiedi quotazione', icon: 'lucideSend' },
  requestApproval: { label: 'Richiedi approvazione', icon: 'lucideSend' },
  approve: { label: 'Approva offerta', icon: 'lucideCircleCheck' },
  refuseApproval: { label: 'Rifiuta approvazione', icon: 'lucideCircleX' },
  offer: { label: 'Genera offerta', icon: 'lucideFileText' },
  accept: { label: 'Registra accettazione', icon: 'lucideCircleCheck' },
  refuse: { label: 'Registra rifiuto', icon: 'lucideCircleX' },
  financing: { label: 'Finanziamento', icon: 'lucideLandmark' },
  confirm: { label: 'Conferma ordine', icon: 'lucideCheck' },
  cancel: { label: 'Annulla ordine', icon: 'lucideBan' },
};

/** Steps that take an order out of the draft: they wait until no other order or contract holds its products. */
const LEAVING_DRAFT_STEPS: OrderStepKind[] = ['requestQuote', 'requestApproval', 'offer'];

/** Statuses in which the back office may evaluate a customization again: until the offer goes out, its amounts frozen after. */
export const EVALUABLE_STATUSES: string[] = [OrderStatus.ToBePriced, OrderStatus.Priced, OrderStatus.Approved];

/** Statuses from which an order can still be cancelled. */
export const CANCELLABLE_STATUSES: string[] = [
  OrderStatus.Draft,
  OrderStatus.ToBePriced,
  OrderStatus.Priced,
  OrderStatus.ToBeApproved,
  OrderStatus.Approved,
  OrderStatus.Sent,
  OrderStatus.Accepted,
];

/**
 * Tells which steps of an order the current user may run, from the summary of the order: status, channel,
 * customizations still to price and offer generated. The order page and the list read the same rules.
 */
@Injectable({ providedIn: 'root' })
export class OrderActionsService {
  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /**
   * Whether the order can be edited: only a draft, by whoever edits orders.
   * @param order the order.
   * @returns true when the draft can be changed.
   */
  canEdit(order: CoreResponseOrderDto | null): boolean {
    return this._permissions.can(Capability.EditOrders) && order?.status === OrderStatus.Draft;
  }

  /**
   * Whether the seller can send the draft to the pricing of its customization.
   * @param order the order.
   * @returns true when the quote can be requested.
   */
  canRequestQuote(order: CoreResponseOrderDto | null): boolean {
    return this._permissions.can(Capability.CreateOrders) && order?.status === OrderStatus.Draft && (order.pendingCustomizations ?? 0) > 0;
  }

  /**
   * Whether the back office can price or refuse the customizations: up to the acceptance.
   * @param order the order.
   * @returns true when the customizations can be evaluated.
   */
  canEvaluateCustomizations(order: CoreResponseOrderDto | null): boolean {
    return this._permissions.can(Capability.PriceCustomizations) && EVALUABLE_STATUSES.includes(order?.status ?? '');
  }

  /**
   * Whether the reseller can ask Keus to approve its offer: every customization priced.
   * @param order the order.
   * @returns true when the approval can be requested.
   */
  canRequestApproval(order: CoreResponseOrderDto | null): boolean {
    return this._permissions.can(Capability.RequestOfferApproval) && order?.channel === SalesChannel.Reseller
      && order.pendingCustomizations === 0 && [OrderStatus.Draft, OrderStatus.Priced].includes(order.status as OrderStatus);
  }

  /**
   * Whether the Keus back office can approve or refuse the offer of the reseller.
   * @param order the order.
   * @returns true when the offer waits for the approval.
   */
  canApprove(order: CoreResponseOrderDto | null): boolean {
    return this._permissions.can(Capability.ApproveOffers) && order?.status === OrderStatus.ToBeApproved;
  }

  /**
   * Whether the seller can generate the offer: direct from a draft or a priced order, indirect once approved.
   * @param order the order.
   * @returns true when the offer can be generated.
   */
  canGenerateOffer(order: CoreResponseOrderDto | null): boolean {
    const statuses = order?.channel === SalesChannel.Reseller ? [OrderStatus.Approved] : [OrderStatus.Draft, OrderStatus.Priced];
    return this._permissions.can(Capability.CreateOrders) && order?.pendingCustomizations === 0
      && statuses.includes(order.status as OrderStatus);
  }

  /**
   * Whether the offer already generated can be downloaded again; the indirect one reads the seller, which only sellers may.
   * @param order the order.
   * @returns true when the offer can be downloaded.
   */
  canDownloadOffer(order: CoreResponseOrderDto | null): boolean {
    return Boolean(order?.offerTemplateId)
      && ![OrderStatus.Draft, OrderStatus.ToBePriced, OrderStatus.Priced, OrderStatus.ToBeApproved, OrderStatus.Approved].includes(order?.status as OrderStatus)
      && (order?.channel === SalesChannel.Direct || this._permissions.can(Capability.CreateOrders));
  }

  /**
   * Whether the outcome of the offer can be recorded.
   * @param order the order.
   * @returns true when the offer went out.
   */
  canRecordOutcome(order: CoreResponseOrderDto | null): boolean {
    return this._permissions.can(Capability.CreateOrders) && order?.status === OrderStatus.Sent;
  }

  /**
   * Whether the financing can be set: direct channel, before the confirmation.
   * @param order the order.
   * @returns true when the financing can be changed.
   */
  canManageFinancing(order: CoreResponseOrderDto | null): boolean {
    return this._permissions.can(Capability.ManageFinancing) && order?.channel === SalesChannel.Direct
      && CANCELLABLE_STATUSES.includes(order.status);
  }

  /**
   * Whether the back office can confirm the order.
   * @param order the order.
   * @returns true when the order is accepted.
   */
  canConfirm(order: CoreResponseOrderDto | null): boolean {
    return this._permissions.can(Capability.ConfirmOrders) && order?.status === OrderStatus.Accepted;
  }

  /**
   * Whether the order can be cancelled: before the confirmation.
   * @param order the order.
   * @returns true when the order can still be cancelled.
   */
  canCancel(order: CoreResponseOrderDto | null): boolean {
    return this._permissions.can(Capability.CreateOrders) && CANCELLABLE_STATUSES.includes(order?.status ?? '');
  }

  /**
   * Explains why a draft cannot go ahead, from what the backend says blocks it.
   * @param order the order.
   * @returns the reason, or null when nothing blocks it.
   */
  blockerMessage(order: CoreResponseOrderDto | null): string | null {
    const blocker = order?.blockedBy;
    if (!blocker) return null;
    return blocker.kind === 'CONTRACT'
      ? `L'ordine non può andare avanti: l'azienda ha ${blocker.code ? `il contratto ${blocker.code}` : 'un contratto'} in vigore su un prodotto di questo ordine.`
      : `L'ordine non può andare avanti: l'azienda ha già ${blocker.code ? `l'ordine ${blocker.code}` : 'un altro ordine'} aperto su un prodotto di questo ordine.`;
  }

  /**
   * Whether a step would take a blocked draft out of the draft, so it stays off.
   * @param kind the step.
   * @param order the order.
   * @returns true when the step is held back.
   */
  isBlocked(kind: OrderStepKind, order: CoreResponseOrderDto | null): boolean {
    return Boolean(order?.blockedBy) && LEAVING_DRAFT_STEPS.includes(kind);
  }

  /**
   * Returns the steps a row of the list offers on an order: the forward ones only, cancellations and refusals stay in
   * the order page.
   * @param order the order.
   * @returns the steps, in the order the row shows them.
   */
  rowSteps(order: CoreResponseOrderDto): OrderStepKind[] {
    const steps: OrderStepKind[] = [];
    if (this.canManageFinancing(order)) steps.push('financing');
    if (this.canRequestQuote(order)) steps.push('requestQuote');
    if (this.canRequestApproval(order)) steps.push('requestApproval');
    if (this.canGenerateOffer(order)) steps.push('offer');
    if (this.canApprove(order)) steps.push('approve');
    if (this.canRecordOutcome(order)) steps.push('accept');
    if (this.canConfirm(order)) steps.push('confirm');
    return steps;
  }
}
