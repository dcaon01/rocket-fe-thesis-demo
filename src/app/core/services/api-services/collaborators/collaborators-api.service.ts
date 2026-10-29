import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CognitoCognitoService, CognitoCollaboratorResponseDto, CognitoCognitoUserCreateDto, CognitoCognitoUserResponseDto, CognitoCognitoUsersPageQueryDto, CognitoCognitoUsersPageResponseDto, CognitoCognitoUserUpdateDto, CognitoMessageResponseDto } from '../../../../../../libs/api/src';
import { PageRequest } from '../../../interfaces/page.interface';

/** Filters of the collaborator listing. */
export type CollaboratorsFilters = Omit<CognitoCognitoUsersPageQueryDto, 'limit' | 'cursor'>;

/**
 * Service for managing user-related API calls.
 * @remarks This service interacts with the CognitoCognitoService to perform CRUD operations on collaborators.
 * Collaborators are users with specific roles and permissions within the application.
 */
@Injectable({
  providedIn: 'root'
})
export class CollaboratorsApiService {
  /** Service for managing user-related API calls. */
  private readonly _cognitoService = inject(CognitoCognitoService);

  /**
   * Lists one page of the collaborators.
   * @param page the page to read.
   * @param filters the filters of the listing.
   * @returns the page of collaborators.
   */
  listCollaborators(page: PageRequest, filters: CollaboratorsFilters): Observable<CognitoCognitoUsersPageResponseDto> {
    return this._cognitoService.cognitoControllerListUsers({ tenant: 'default', body: { ...page, ...filters } });
  }

  /**
   * Lists the collaborators of a reseller, optionally only the ones with a profile, such as its salespeople.
   * @param resellerCode the code of the reseller.
   * @param group the profile the collaborators must have, every profile when absent.
   * @returns the collaborators of the reseller.
   */
  getResellerCollaborators(resellerCode: string, group?: CognitoCognitoUsersPageQueryDto['group']): Observable<CognitoCollaboratorResponseDto[]> {
    return this._cognitoService.cognitoControllerGetCollaboratorsByReseller({ code: resellerCode, group });
  }

  /**
   * Retrieves collaborator data by collaborator ID.
   * @param collaboratorId the collaborator's identifier to retrieve collaborator data
   * @returns the collaborator's data.
   */
  getCollaboratorById(collaboratorId: string): Observable<CognitoCognitoUserResponseDto> {
    return this._cognitoService.cognitoControllerGetUser({
      id: collaboratorId,
    });
  }

  /**
   * Creates a new collaborator with the provided data.
   * @param collaboratorData the data to create the collaborator with.
   * @returns the created collaborator.
   */
  createCollaborator(collaboratorData: CognitoCognitoUserCreateDto): Observable<CognitoCognitoUserResponseDto> {
    return this._cognitoService.cognitoControllerCreateUser({
      tenant: 'default',
      body: collaboratorData  
    });
  }

  /**
   * Updates the collaborator data for a specific collaborator.
   * @param collaboratorId identifier of the collaborator to update.
   * @param collaboratorData partial collaborator data to update. 
   * @returns an observable emitting a message response.
   */
  updateCollaborator(collaboratorId: string, collaboratorData: CognitoCognitoUserUpdateDto): Observable<CognitoMessageResponseDto> {
    return this._cognitoService.cognitoControllerUpdateUser({
      tenant: 'default',
      id: collaboratorId,
      body: collaboratorData
    });
  }

  /**
   * Deletes a collaborator, which the backend allows only once it is deactivated.
   * @param collaboratorId identifier of the collaborator to delete.
   * @returns an observable emitting a message response.
   */
  deleteCollaborator(collaboratorId: string): Observable<CognitoMessageResponseDto> {
    return this._cognitoService.cognitoControllerDeleteUser({
      tenant: 'default',
      id: collaboratorId
    });
  }
}
