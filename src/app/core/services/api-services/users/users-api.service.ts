import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CoreCreateUserDto, CoreResponsePendingOperationDto, CoreResponseUserDto, CoreResponseUsersPageDto, CoreUpdateUserDto, CoreUsersPageQueryDto, CoreUsersService } from '../../../../../../libs/api/src';
import { PageRequest } from '../../../interfaces/page.interface';

/** Filters of the user listing, with the product. */
export type UsersFilters = Omit<CoreUsersPageQueryDto, 'limit' | 'cursor'> & { productId: string };

@Injectable({
  providedIn: 'root'
})
export class UsersApiService {
  /** Core users service instance. */
  private readonly _coreUsersService = inject(CoreUsersService);

  /**
   * Retrieves a user by its identifier.
   * @param productId the product id the user is associated with.
   * @param id the user id to retrieve.
   * @returns the user with the specified id.
   */
  getUser(productId: string, id: string): Observable<CoreResponseUserDto> {
    return this._coreUsersService.usersControllerGetUser({ productId, id });
  }

  /**
   * Retrieves the users of a company: those of its tenants on every product.
   * @param companyId the identifier of the company.
   * @returns the users of the company.
   */
  getUsersByCompany(companyId: string): Observable<CoreResponseUserDto[]> {
    return this._coreUsersService.usersControllerGetUsersByCompany({ companyId });
  }

  /**
   * Lists one page of the users of a product.
   * @param page the page to read.
   * @param filters the filters of the listing.
   * @returns the page of the users of a product.
   */
  listUsers(page: PageRequest, filters: UsersFilters): Observable<CoreResponseUsersPageDto> {
    const { productId, ...rest } = filters;
    return this._coreUsersService.usersControllerListUsers({ productId, body: { ...page, ...rest } });
  }

  /**
   * Creates a new user.
   * @param user the information to create the user.
   * @returns the created user.
   */
  createUser(user: CoreCreateUserDto): Observable<CoreResponseUserDto> {
    return this._coreUsersService.usersControllerCreateUser({ body: user });
  }

  /**
   * Updates an existing user.
   * @param productId the product id the user is associated with.
   * @param id the user id to update.
   * @param user the data to update the user.
   * @returns the updated user.
   */
  updateUser(productId: string, id: string, user: CoreUpdateUserDto): Observable<CoreResponseUserDto> {
    return this._coreUsersService.usersControllerUpdateUser({ productId, id, body: user });
  }

  /**
   * Sends a user request to the product again.
   * @param productId the product id the user is associated with.
   * @param id the user id.
   * @returns the user, back to requested.
   */
  resendUserRequest(productId: string, id: string): Observable<CoreResponseUserDto> {
    return this._coreUsersService.usersControllerResendUserRequest({ productId, id });
  }

  /**
   * Gives up a user request.
   * @param productId the product id the user is associated with.
   * @param id the user id.
   * @returns the cancelled user.
   */
  cancelUserRequest(productId: string, id: string): Observable<CoreResponseUserDto> {
    return this._coreUsersService.usersControllerCancelUserRequest({ productId, id });
  }

  /**
   * Asks the product to delete a user: it becomes deleted when the product confirms.
   * @param productId the product id the user is associated with.
   * @param id the user id to delete.
   * @returns the user, waiting for the product.
   */
  deleteUser(productId: string, id: string): Observable<CoreResponseUserDto> {
    return this._coreUsersService.usersControllerDeleteUser({ productId, id });
  }

  /**
   * Removes for good a deleted user, or a discarded request.
   * @param productId the product id the user is associated with.
   * @param id the user id.
   */
  purgeUser(productId: string, id: string): Observable<void> {
    return this._coreUsersService.usersControllerPurgeUser({ productId, id });
  }

  /**
   * Lists the operations sent to the product for a user, oldest first.
   * @param productId the product id the user is associated with.
   * @param id the user id.
   * @returns the operations of the user.
   */
  listUserOperations(productId: string, id: string): Observable<CoreResponsePendingOperationDto[]> {
    return this._coreUsersService.usersControllerListUserOperations({ productId, id });
  }
}