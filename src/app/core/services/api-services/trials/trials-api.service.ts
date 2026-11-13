import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CoreCreateTrialDto, CoreResponseTrialDto, CoreResponseTrialsPageDto, CoreTrialsPageQueryDto, CoreTrialsService, CoreUpdateTrialDto } from '../../../../../../libs/api/src';
import { PageRequest } from '../../../interfaces/page.interface';

/** Filters of the trial listing, with the product. */
export type TrialsFilters = Omit<CoreTrialsPageQueryDto, 'limit' | 'cursor'> & { productId: string };

@Injectable({
  providedIn: 'root'
})
export class TrialsApiService {
  /** Core trials service instance. */
  private readonly _coreTrialsService = inject(CoreTrialsService);

  /**
   * Retrieves all the trials in Rocket.
   * @returns all the trials in Rocket.
   */
  getAllTrials(): Observable<CoreResponseTrialDto[]> {
    return this._coreTrialsService.trialsControllerGetAllTrials({});
  }

  /**
   * Lists one page of the trials of a product.
   * @param page the page to read.
   * @param filters the filters of the listing.
   * @returns the page of the trials of a product.
   */
  listTrials(page: PageRequest, filters: TrialsFilters): Observable<CoreResponseTrialsPageDto> {
    const { productId, ...rest } = filters;
    return this._coreTrialsService.trialsControllerListTrials({ productId, body: { ...page, ...rest } });
  }

  /**
   * Retrieves a trial.
   * @param productId the identifier of the product.
   * @param id the identifier of the trial.
   * @returns the trial with the specified id.
   */
  getTrial(productId: string, id: string): Observable<CoreResponseTrialDto> {
    return this._coreTrialsService.trialsControllerGetTrial({ productId, id });
  }

  /**
   * Creates a new trial.
   * @param trial the data of the trial to create.
   * @returns the created trial.
   */
  createTrial(trial: CoreCreateTrialDto): Observable<CoreResponseTrialDto> {
    return this._coreTrialsService.trialsControllerCreateTrial({ body: trial });
  }

  /**
   * Updates an existing trial.
   * @param productId the identifier of the product.
   * @param id the identifier of the trial.
   * @param trial the data to update the trial.
   * @returns the updated trial.
   */
  updateTrial(productId: string, id: string, trial: CoreUpdateTrialDto): Observable<CoreResponseTrialDto> {
    return this._coreTrialsService.trialsControllerUpdateTrial({ productId, id, body: trial });
  }

  /**
   * Deletes a trial.
   * @param productId the identifier of the product.
   * @param id the identifier of the trial.
   */
  deleteTrial(productId: string, id: string): Observable<void> {
    return this._coreTrialsService.trialsControllerDeleteTrial({ productId, id });
  }
}
