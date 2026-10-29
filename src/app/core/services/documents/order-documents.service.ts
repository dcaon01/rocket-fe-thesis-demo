import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, shareReplay, switchMap, tap, throwError } from 'rxjs';
import {
  CoreResponseOrderDto,
  CoreResponsePlaceholderCatalogDto,
  CoreResponsePlanDto,
  CoreResponseTemplateDto,
} from '../../../../../libs/api/src';
import { SalesChannel } from '../../enums/sales-channel.enum';
import { TemplateFormat } from '../../enums/template-format.enum';
import { TemplateType } from '../../enums/template-type.enum';
import { offerData, OfferReseller } from '../../utils/document-data.util';
import { TemplateData } from '../../utils/template-data.util';
import { CompaniesApiService } from '../api-services/companies/companies-api.service';
import { OrdersApiService } from '../api-services/orders/orders-api.service';
import { PlansApiService } from '../api-services/plans/plans-api.service';
import { ResellersApiService } from '../api-services/resellers/resellers-api.service';
import { TemplatesApiService } from '../api-services/templates/templates-api.service';
import { ToasterService } from '../toaster/toaster.service';
import { DocumentRenderService } from './document-render.service';

/** A document filled from its template: HTML to show, or a DOCX to download. */
export type FilledDocument = { html: string } | { docx: Blob };

/** Failure the user has already been told about: by a specific toast, or by the CRUD interceptor on a write. */
class ReportedError extends Error {}

/**
 * Service that produces the documents of an order from the templates in force: the offer, HTML on the
 * direct channel and DOCX on the indirect one, and the client sheet of a company. Nothing is stored.
 */
@Injectable({
  providedIn: 'root'
})
export class OrderDocumentsService {
  /** Templates API service instance. */
  private readonly _templatesApiService = inject(TemplatesApiService);

  /** Orders API service instance. */
  private readonly _ordersApiService = inject(OrdersApiService);

  /** Companies API service instance. */
  private readonly _companiesApiService = inject(CompaniesApiService);

  /** Plans API service instance. */
  private readonly _plansApiService = inject(PlansApiService);

  /** Resellers API service instance. */
  private readonly _resellersApiService = inject(ResellersApiService);

  /** Document render service instance. */
  private readonly _documentRenderService = inject(DocumentRenderService);

  /** Toaster service instance. */
  private readonly _toasterService = inject(ToasterService);

  /**
   * Fills the offer of an order and hands it to the user. With `record` the offer comes from the template
   * in force and is recorded on the order, which moves to SENT; without, it is filled again from the
   * template it was generated from. Must be called inside a click, for the HTML tab to open.
   * @param order the order.
   * @param record whether the offer is generated now and recorded.
   * @returns the updated order once recorded, or null when the offer is only downloaded again.
   */
  offer(order: CoreResponseOrderDto, record: boolean): Observable<CoreResponseOrderDto | null> {
    const channel = order.channel as SalesChannel;
    const template$ = record || !order.offerTemplateId
      ? this._templatesApiService.resolveTemplate(TemplateType.Offer, channel)
      : this._templatesApiService.getTemplate(TemplateType.Offer, order.offerTemplateId);

    const result$ = forkJoin({
      template: template$.pipe(switchMap(template => this._requireTemplate(template, 'Nessun template di offerta pubblicato per questo canale.'))),
      catalog: this._templatesApiService.getPlaceholderCatalog(TemplateType.Offer, channel),
      data: this._offerData(order),
    }).pipe(
      switchMap(({ template, catalog, data }) => this._fill(template, catalog, data).pipe(
        switchMap(document => record
          ? this._ordersApiService.generateOffer(order.id, { templateId: template.id }).pipe(
            map(updated => ({ document, updated })),
            catchError(error => throwError(() => new ReportedError((error as Error).message))),
          )
          : of({ document, updated: null })),
      )),
      tap({ error: error => this._reportFailure(error, 'Non è stato possibile generare l\'offerta.') }),
      // Recording runs once whoever subscribes: the tab or the download below, and the caller, share one execution.
      shareReplay(1),
    );

    // The direct channel is HTML: the tab opens now, inside the click, and shows the offer once ready.
    if (channel === SalesChannel.Direct) {
      this._documentRenderService.openHtml(result$.pipe(map(({ document }) => this._htmlOf(document))));
    } else {
      result$.subscribe({
        next: ({ document }) => this._documentRenderService.download(this._docxOf(document), `offerta-${order.code}.docx`),
        error: error => console.error('Offer could not be generated', error),
      });
    }
    return result$.pipe(map(({ updated }) => updated));
  }

  /**
   * Fills again the offer the order was sent with, to show it in the page.
   * @param order the order, with its offer generated.
   * @returns the offer.
   */
  offerDocument(order: CoreResponseOrderDto): Observable<FilledDocument> {
    const channel = order.channel as SalesChannel;
    return forkJoin({
      template: this._templatesApiService.getTemplate(TemplateType.Offer, order.offerTemplateId ?? ''),
      catalog: this._templatesApiService.getPlaceholderCatalog(TemplateType.Offer, channel),
      data: this._offerData(order),
    }).pipe(switchMap(({ template, catalog, data }) => this._fill(template, catalog, data)));
  }

  /**
   * Reads what the offer needs besides the order: the company, the plans of the lines and, on the indirect channel, the reseller with its logo.
   * @param order the order.
   * @returns the data of the offer.
   */
  private _offerData(order: CoreResponseOrderDto): Observable<TemplateData> {
    const lines = (order.lines ?? []).filter(line => line.planId);
    const plans$: Observable<CoreResponsePlanDto[]> = lines.length
      ? forkJoin(lines.map(line => this._plansApiService.getPlan(line.productId, line.planId!)))
      : of([]);
    const seller$: Observable<OfferReseller | undefined> = order.channel === SalesChannel.Reseller
      ? this._ordersApiService.getSeller(order.companyId).pipe(
        switchMap(seller => seller.resellerId ? this._resellersApiService.getReseller(seller.resellerId) : throwError(() => new Error('The order has no reseller.'))),
        switchMap(reseller => (reseller.logoS3Key
          ? this._documentRenderService.loadFile('RESELLER_LOGO', reseller.logoS3Key).pipe(
            map(logo => new Uint8Array(logo)),
            // Without its logo the offer is still valid: the picture is removed.
            catchError(() => of(undefined)),
          )
          : of(undefined)
        ).pipe(map(logo => ({ reseller, ...(logo ? { logo } : {}) })))),
      )
      : of(undefined);

    return forkJoin({
      company: this._companiesApiService.getCompany(order.companyId),
      plans: plans$,
      seller: seller$,
    }).pipe(map(({ company, plans, seller }) =>
      offerData(order, company, Object.fromEntries(plans.map(plan => [plan.id, plan])), seller)
    ));
  }

  /**
   * Fills a template with its data: HTML through Handlebars, DOCX through docxtemplater, with the pictures placed.
   * @param template the template.
   * @param catalog the placeholders of its scope.
   * @param data the data.
   * @returns the filled document.
   */
  private _fill(template: CoreResponseTemplateDto, catalog: CoreResponsePlaceholderCatalogDto, data: TemplateData): Observable<FilledDocument> {
    if (template.format === TemplateFormat.Html) {
      return of({ html: this._documentRenderService.renderHtml(template.body ?? '', data) });
    }
    if (!template.sourceS3Key) {
      return throwError(() => new Error(`Template ${template.id} has no DOCX source.`));
    }
    return this._documentRenderService.loadFile('TEMPLATE_SOURCE', template.sourceS3Key).pipe(
      map(source => ({ docx: this._documentRenderService.renderDocx(source, data, catalog, false) }))
    );
  }

  /**
   * Fails when no template is in force, telling the user why.
   * @param template the template resolved, null when none is in force.
   * @param message what to tell the user.
   * @returns the template.
   */
  private _requireTemplate(template: CoreResponseTemplateDto | null, message: string): Observable<CoreResponseTemplateDto> {
    if (template) return of(template);
    this._toasterService.showError(message);
    return throwError(() => new ReportedError(message));
  }

  /**
   * Tells the user that a document could not be produced, unless they have already been told.
   * @param error the failure.
   * @param message what to tell the user.
   */
  private _reportFailure(error: unknown, message: string): void {
    if (!(error instanceof ReportedError)) {
      this._toasterService.showError(message);
    }
  }

  /**
   * Reads the HTML of a filled document.
   * @param document the document.
   * @returns the HTML.
   */
  private _htmlOf(document: FilledDocument): string {
    if ('html' in document) return document.html;
    throw new Error('The offer template of the direct channel is not HTML.');
  }

  /**
   * Reads the DOCX of a filled document.
   * @param document the document.
   * @returns the DOCX.
   */
  private _docxOf(document: FilledDocument): Blob {
    if ('docx' in document) return document.docx;
    throw new Error('The template is not DOCX.');
  }
}
