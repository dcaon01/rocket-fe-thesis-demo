import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CoreCreateTemplateDto,
  CoreResponsePlaceholderCatalogDto,
  CoreResponseTemplateDto,
  CoreResponseTemplatesPageDto,
  CoreTemplatesPageQueryDto,
  CoreTemplatesService,
  CoreUpdateTemplateDto,
} from '../../../../../../libs/api/src';
import { PageRequest } from '../../../interfaces/page.interface';

/** Filters of the template listing. */
export type TemplatesFilters = Omit<CoreTemplatesPageQueryDto, 'limit' | 'cursor'>;

/** Kind of document a template produces. */
export type TemplateType = CoreResponseTemplateDto['type'];

/** Sales channel an offer template is bound to. */
export type TemplateChannel = NonNullable<CoreResponseTemplateDto['channel']>;

/**
 * Wrapper around the generated templates API.
 * Only drafts are editable: a published template changes by duplicating it and publishing the copy.
 */
@Injectable({
  providedIn: 'root'
})
export class TemplatesApiService {
  /** Core templates service instance. */
  private readonly _coreTemplatesService = inject(CoreTemplatesService);

  /**
   * Creates a template in draft.
   * @param template the template to create.
   * @returns the created template.
   */
  createTemplate(template: CoreCreateTemplateDto): Observable<CoreResponseTemplateDto> {
    return this._coreTemplatesService.templatesControllerCreateTemplate({ body: template });
  }

  /**
   * Lists one page of the templates.
   * @param page the page to read.
   * @param filters the filters of the listing.
   * @returns the page of the templates.
   */
  listTemplates(page: PageRequest, filters: TemplatesFilters): Observable<CoreResponseTemplatesPageDto> {
    return this._coreTemplatesService.templatesControllerListTemplates({ body: { ...page, ...filters } });
  }

  /**
   * Retrieves a template by type and id.
   * @param type the type of the template.
   * @param id the identifier of the template.
   * @returns the template.
   */
  getTemplate(type: TemplateType, id: string): Observable<CoreResponseTemplateDto> {
    return this._coreTemplatesService.templatesControllerGetTemplate({ type, id });
  }

  /**
   * Retrieves the template in force for a scope.
   * @param type the type of template to resolve.
   * @param channel the channel, for the offer templates.
   * @returns the published template.
   */
  resolveTemplate(type: TemplateType, channel?: TemplateChannel): Observable<CoreResponseTemplateDto> {
    return this._coreTemplatesService.templatesControllerResolveTemplate({ type, channel });
  }

  /**
   * Retrieves the placeholders a template scope may use, with the format that decides the loop syntax.
   * @param type the type of template.
   * @param channel the channel, for the offer templates.
   * @returns the placeholder catalog of the scope.
   */
  getPlaceholderCatalog(type: TemplateType, channel?: TemplateChannel): Observable<CoreResponsePlaceholderCatalogDto> {
    return this._coreTemplatesService.templatesControllerGetPlaceholderCatalog({ type, channel });
  }

  /**
   * Updates a draft template.
   * @param type the type of the template.
   * @param id the identifier of the template.
   * @param template the data to apply.
   * @returns the updated template.
   */
  updateTemplate(type: TemplateType, id: string, template: CoreUpdateTemplateDto): Observable<CoreResponseTemplateDto> {
    return this._coreTemplatesService.templatesControllerUpdateTemplate({ type, id, body: template });
  }

  /**
   * Publishes a template, withdrawing the one in force for its scope.
   * @param type the type of the template.
   * @param id the identifier of the template.
   * @returns the published template.
   */
  publishTemplate(type: TemplateType, id: string): Observable<CoreResponseTemplateDto> {
    return this._coreTemplatesService.templatesControllerPublishTemplate({ type, id });
  }

  /**
   * Withdraws a published template, leaving its scope without one in force.
   * @param type the type of the template.
   * @param id the identifier of the template.
   * @returns the withdrawn template.
   */
  withdrawTemplate(type: TemplateType, id: string): Observable<CoreResponseTemplateDto> {
    return this._coreTemplatesService.templatesControllerWithdrawTemplate({ type, id });
  }

  /**
   * Creates a draft copy of a template, the way to change a published one.
   * @param type the type of the template.
   * @param id the identifier of the template to copy.
   * @returns the new draft.
   */
  duplicateTemplate(type: TemplateType, id: string): Observable<CoreResponseTemplateDto> {
    return this._coreTemplatesService.templatesControllerDuplicateTemplate({ type, id });
  }

  /**
   * Deletes a draft template together with its DOCX source.
   * @param type the type of the template.
   * @param id the identifier of the template.
   */
  deleteTemplate(type: TemplateType, id: string): Observable<void> {
    return this._coreTemplatesService.templatesControllerDeleteTemplate({ type, id });
  }
}
