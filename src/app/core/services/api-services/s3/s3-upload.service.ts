import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of, switchMap, tap } from 'rxjs';
import { CognitoS3Service, CoreS3Service } from '../../../../../../libs/api/src';
import { ToasterService } from '../../toaster/toaster.service';

/** Entity types supported for S3 upload (Core backend). */
export type S3CoreEntityType =
  | 'PRODUCT_LOGO'
  | 'MATERIAL_FILE'
  | 'TEMPLATE_SOURCE'
  | 'RESELLER_LOGO'
  | 'ORDER_SIGNED_OFFER'
  | 'ORDER_FINANCING_CONTRACT'
  | 'ORDER_CUSTOMIZATION_ATTACHMENT'
  | 'ORDER_CUSTOMIZATION_VOICE_NOTE'
  | 'RESELLER_CONTRACT_SIGNED';

/** Entity types of the files attached to an order. */
export type S3OrderEntityType = Extract<S3CoreEntityType, `ORDER_${string}`>;

/** MIME type of a Word document. */
const DOCX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Entity types supported for S3 upload (Cognito backend). */
export type S3CognitoEntityType = 'user-profile-photo';

@Injectable({
  providedIn: 'root'
})
export class S3UploadService {
  /** HTTP client instance (used only for direct S3 PUT uploads). */
  private readonly _http = inject(HttpClient);

  /** Core S3 service instance. */
  private readonly _coreS3Service = inject(CoreS3Service);

  /** Cognito S3 service instance. */
  private readonly _cognitoS3Service = inject(CognitoS3Service);

  /** Toaster service instance, for the links that cannot be signed: the interceptor does not report a failed read. */
  private readonly _toasterService = inject(ToasterService);

  /**
   * Uploads a file directly to S3 using a presigned URL.
   * @param presignedUrl the presigned URL.
   * @param file the file to upload.
   * @param contentType the content type of the file.
   * @returns an observable that completes when the upload is done.
   */
  uploadToS3(presignedUrl: string, file: File, contentType: string): Observable<void> {
    return this._http.put<void>(presignedUrl, file, {
      headers: {
        'Content-Type': contentType
      }
    });
  }

  /**
   * Uploads the framework agreement signed by a reseller to S3.
   * @param resellerId the reseller the contract belongs to.
   * @param contractId the reseller contract.
   * @param file the PDF file to upload.
   * @returns an observable with the S3 key.
   */
  uploadResellerContractPdf(resellerId: string, contractId: string, file: File): Observable<string> {
    return this._coreS3Service.s3ControllerGetPresignedUrl({
      action: 'UPLOAD',
      entityType: 'RESELLER_CONTRACT_SIGNED',
      entityId: contractId,
      resellerId,
      filename: file.name,
      contentType: 'application/pdf'
    }).pipe(
      switchMap(response => this.uploadToS3(response.url, file, 'application/pdf').pipe(
        switchMap(() => of(response.s3Key))
      ))
    );
  }

  /**
   * Uploads a product logo to S3.
   * @param productId the product ID.
   * @param file the image file to upload.
   * @returns an observable with the S3 key.
   */
  uploadProductLogo(productId: string, file: File): Observable<string> {
    const contentType = file.type || 'image/png';

    return this._coreS3Service.s3ControllerGetPresignedUrl({
      action: 'UPLOAD',
      entityType: 'PRODUCT_LOGO',
      entityId: productId,
      filename: file.name,
      contentType: contentType
    }).pipe(
      switchMap(response => {
        return this.uploadToS3(response.url, file, contentType).pipe(
          switchMap(() => of(response.s3Key))
        );
      })
    );
  }

  /**
   * Gets a presigned download URL for a file from S3 (Core backend).
   * @param entityType the entity type.
   * @param s3Key the S3 key of the file.
   * @returns the presigned download URL.
   */
  getDownloadUrl(entityType: S3CoreEntityType, s3Key: string): Observable<string> {
    return this._coreS3Service.s3ControllerGetPresignedUrl({
      action: 'DOWNLOAD',
      entityType: entityType,
      s3Key: s3Key,
    }).pipe(
      map(response => response.url),
      tap({ error: () => this._toasterService.showError('Non è stato possibile aprire il file.') }),
    );
  }

  /**
   * Uploads the file of a sales material to S3; the material is then updated with the returned key.
   * @param materialId the material ID.
   * @param file the file to upload.
   * @returns an observable with the S3 key.
   */
  uploadMaterialFile(materialId: string, file: File): Observable<string> {
    return this._uploadCoreFile('MATERIAL_FILE', materialId, file, file.type || 'application/octet-stream');
  }

  /**
   * Uploads the DOCX source of a draft template to S3; the template is then updated with the returned key.
   * @param templateId the template ID.
   * @param file the DOCX file to upload.
   * @returns an observable with the S3 key.
   */
  uploadTemplateSource(templateId: string, file: File): Observable<string> {
    return this._uploadCoreFile('TEMPLATE_SOURCE', templateId, file, DOCX_CONTENT_TYPE);
  }

  /**
   * Uploads a reseller logo to S3; the backend saves the key on the reseller from the upload event.
   * @param resellerId the reseller ID.
   * @param file the PNG or JPEG file to upload.
   * @returns an observable with the S3 key.
   */
  uploadResellerLogo(resellerId: string, file: File): Observable<string> {
    return this._uploadCoreFile('RESELLER_LOGO', resellerId, file, file.type || 'image/png');
  }

  /**
   * Uploads a file of an order to S3; the order is then updated with the returned key.
   * @param entityType the kind of order file.
   * @param orderId the order ID.
   * @param file the file to upload.
   * @returns an observable with the S3 key.
   */
  uploadOrderFile(entityType: S3OrderEntityType, orderId: string, file: File): Observable<string> {
    const contentType = entityType === 'ORDER_CUSTOMIZATION_VOICE_NOTE' ? file.type || 'audio/webm' : 'application/pdf';
    return this._uploadCoreFile(entityType, orderId, file, contentType);
  }

  /**
   * Uploads a user profile photo to S3 via Cognito backend.
   * @param userId the Cognito user sub (ID).
   * @param file the image file to upload.
   * @returns an observable with the S3 key.
   */
  uploadUserProfilePhoto(userId: string, file: File): Observable<string> {
    const contentType = file.type || 'image/jpeg';

    return this._cognitoS3Service.s3ControllerGetPresignedUrl({
      action: 'upload',
      entityType: 'user-profile-photo',
      userId: userId,
      filename: file.name,
      contentType: contentType
    }).pipe(
      switchMap(response => {
        return this.uploadToS3(response.url, file, contentType).pipe(
          switchMap(() => of(response.s3Key))
        );
      })
    );
  }

  /**
   * Gets a presigned download URL for a file from S3 (Cognito backend).
   * @param s3Key the S3 key of the file.
   * @returns the presigned download URL.
   */
  getDownloadUrlCognito(s3Key: string): Observable<string> {
    return this._cognitoS3Service.s3ControllerGetPresignedUrl({
      action: 'download',
      entityType: 'user-profile-photo',
      s3Key: s3Key,
    }).pipe(map(response => response.url));
  }

  /**
   * Requests a presigned upload URL for an entity of the Core backend and uploads the file to it.
   * @param entityType the entity type.
   * @param entityId the entity ID.
   * @param file the file to upload.
   * @param contentType the content type the URL is signed for.
   * @returns an observable with the S3 key.
   */
  private _uploadCoreFile(entityType: S3CoreEntityType, entityId: string, file: File, contentType: string): Observable<string> {
    return this._coreS3Service.s3ControllerGetPresignedUrl({
      action: 'UPLOAD',
      entityType,
      entityId,
      filename: file.name,
      contentType,
    }).pipe(
      switchMap(response => this.uploadToS3(response.url, file, contentType).pipe(map(() => response.s3Key)))
    );
  }
}
