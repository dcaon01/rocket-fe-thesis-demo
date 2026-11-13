import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CoreCreatePlanDto, CorePlansPageQueryDto, CorePlansService, CoreResponsePlanDto, CoreResponsePlansPageDto, CoreUpdatePlanDto } from '../../../../../../libs/api/src';
import { PageRequest } from '../../../interfaces/page.interface';

/** Filters of the plan listing, with the product. */
export type PlansFilters = Omit<CorePlansPageQueryDto, 'limit' | 'cursor'> & { productId: string };

@Injectable({
  providedIn: 'root'
})
export class PlansApiService {
  /** Core plans service instance. */
  private readonly _corePlansService = inject(CorePlansService);

  /**
   * Lists one page of the plans of a product.
   * @param page the page to read.
   * @param filters the filters of the listing.
   * @returns the page of the plans of a product.
   */
  listPlans(page: PageRequest, filters: PlansFilters): Observable<CoreResponsePlansPageDto> {
    const { productId, ...rest } = filters;
    return this._corePlansService.plansControllerListPlans({ productId, body: { ...page, ...rest } });
  }

  /**
   * Retrieves a single plan.
   * @param productId the identifier of the product.
   * @param id the identifier of the plan.
   * @returns the plan with the specified id.
   */
  getPlan(productId: string, id: string): Observable<CoreResponsePlanDto> {
    return this._corePlansService.plansControllerGetPlan({ productId, id });
  }

  /**
   * Creates a new plan.
   * @param productId the identifier of the product the plan belongs to.
   * @param plan the data of the plan to create.
   * @returns the created plan.
   */
  createPlan(productId: string, plan: CoreCreatePlanDto): Observable<CoreResponsePlanDto> {
    return this._corePlansService.plansControllerCreatePlan({ productId, body: plan });
  }

  /**
   * Updates an existing plan.
   * @param productId the identifier of the product.
   * @param id the identifier of the plan.
   * @param plan the data to update the plan.
   * @returns the updated plan.
   */
  updatePlan(productId: string, id: string, plan: CoreUpdatePlanDto): Observable<CoreResponsePlanDto> {
    return this._corePlansService.plansControllerUpdatePlan({ productId, id, body: plan });
  }

  /**
   * Deletes a plan.
   * @param productId the identifier of the product.
   * @param id the identifier of the plan.
   */
  deletePlan(productId: string, id: string): Observable<void> {
    return this._corePlansService.plansControllerDeletePlan({ productId, id });
  }
}
