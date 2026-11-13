import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CoreCreateDocumentDto, CoreDocumentsService, CoreResponseDocumentDto } from '../../../../../../libs/api/src';

/** The three kinds of entity a document can be attached to, as the API names them. */
type DocumentOwnerType = CoreCreateDocumentDto['ownerType'];

@Injectable({
  providedIn: 'root'
})
export class DocumentsApiService {
  /** Documents Service. */
  private readonly _documentsService = inject(CoreDocumentsService);

  /**
   * Register a document against its owner.
   * @param document the document to register.
   * @return An observable of the registered document.
   */
  createDocument(document: CoreCreateDocumentDto): Observable<CoreResponseDocumentDto> {
    return this._documentsService.documentsControllerCreateDocument({ body: document });
  }

  /**
   * Get the documents of an owner.
   * @param ownerType the kind of owner.
   * @param ownerId the identifier of the owner.
   * @return An observable of document array.
   */
  getDocuments(ownerType: DocumentOwnerType, ownerId: string): Observable<CoreResponseDocumentDto[]> {
    return this._documentsService.documentsControllerGetDocuments({ ownerType, ownerId });
  }

  /**
   * Mark a document as uploaded.
   * @param ownerType the kind of owner.
   * @param ownerId the identifier of the owner.
   * @param id the identifier of the document.
   * @return An observable of the updated document.
   */
  confirmUpload(ownerType: DocumentOwnerType, ownerId: string, id: string): Observable<CoreResponseDocumentDto> {
    return this._documentsService.documentsControllerConfirmUpload({ ownerType, ownerId, id });
  }

  /**
   * Delete a document.
   * @param ownerType the kind of owner.
   * @param ownerId the identifier of the owner.
   * @param id the identifier of the document.
   * @return An observable of the deletion.
   */
  deleteDocument(ownerType: DocumentOwnerType, ownerId: string, id: string): Observable<void> {
    return this._documentsService.documentsControllerDeleteDocument({ ownerType, ownerId, id });
  }
}
