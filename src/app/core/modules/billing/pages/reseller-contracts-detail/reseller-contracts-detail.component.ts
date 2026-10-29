import { Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleStop, lucideDownload, lucideEllipsisVertical, lucideFileText, lucidePenLine, lucideRotateCcw, lucideSquareArrowOutUpRight } from '@ng-icons/lucide';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { finalize, switchMap } from 'rxjs';
import { CoreResponseResellerContractDto } from '../../../../../../../libs/api/src';
import { FileDropComponent } from '../../../../components/file-drop/file-drop.component';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { ContractStatusDirective } from '../../../../directives/contract-status.directive';
import { Capability } from '../../../../enums/capability.enum';
import { ResellerContractStatus } from '../../../../enums/reseller-contract-status.enum';
import { TemplateType } from '../../../../enums/template-type.enum';
import { ContractStatusPipe } from '../../../../pipes/contract-status/contract-status.pipe';
import { ResellerContractsApiService } from '../../../../services/api-services/reseller-contracts/reseller-contracts-api.service';
import { S3UploadService } from '../../../../services/api-services/s3/s3-upload.service';
import { TemplatesApiService } from '../../../../services/api-services/templates/templates-api.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { ResellerContractFormComponent } from '../../components/reseller-contract-form/reseller-contract-form.component';
import { openInNewTab } from '../../../../utils/open-in-new-tab.util';

/** Largest signed agreement accepted, in bytes (10 MB). */
const MAX_PDF_SIZE = 10 * 1024 * 1024;

/** Actions on a reseller contract that ask for a confirmation. */
type ContractAction = 'sign' | 'terminate' | 'reactivate' | 'end';

/**
 * Page of a reseller contract: its terms while it is a draft, then its signing, payment and end.
 */
@Component({
  selector: 'rocket-reseller-contracts-detail',
  imports: [
    ...BrnDialogImports,
    ...HlmBadgeImports,
    ...HlmButtonImports,
    ...HlmDialogImports,
    ...HlmDropdownMenuImports,
    ...HlmLabelImports,
    ...HlmTooltipImports,
    FileDropComponent,
    PageHeaderComponent,
    ResellerContractFormComponent,
    ContractStatusDirective,
    ContractStatusPipe,
    NgIcon
  ],
  providers: [
    provideIcons({
      lucideCircleStop,
      lucideDownload,
      lucideEllipsisVertical,
      lucideFileText,
      lucidePenLine,
      lucideRotateCcw,
      lucideSquareArrowOutUpRight
    })
  ],
  templateUrl: './reseller-contracts-detail.component.html',
  styleUrl: './reseller-contracts-detail.component.css'
})
export class ResellerContractsDetailComponent {
  /** Router instance. */
  private readonly _router = inject(Router);
  /** Activated route instance. */
  private readonly _activatedRoute = inject(ActivatedRoute);
  /** Reseller contracts API service instance. */
  private readonly _resellerContractsService = inject(ResellerContractsApiService);
  /** S3 upload service instance. */
  private readonly _s3UploadService = inject(S3UploadService);
  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);
  /** Templates API service instance. */
  private readonly _templatesService = inject(TemplatesApiService);

  /** Reference to the reseller contract form. */
  form = viewChild<ResellerContractFormComponent>('form');
  /** Reference to the action confirmation dialog. */
  actionDialog = viewChild<BrnDialog>('actionDialog');

  /** Contract statuses, for the template. */
  readonly ResellerContractStatus = ResellerContractStatus;

  /** Identifier of the reseller, from the route. */
  private readonly _resellerId = this._activatedRoute.snapshot.paramMap.get('resellerId') ?? '';
  /** Identifier of the contract, from the route. */
  private readonly _contractId = this._activatedRoute.snapshot.paramMap.get('contractId') ?? '';

  /** Contract shown by the page. */
  contract = signal<CoreResponseResellerContractDto | undefined>(undefined);

  /** Signed agreement picked in the signing dialog. */
  signedFile = signal<File | null>(null);

  /** Error of the signed agreement picked. */
  signedFileError = signal<string | null>(null);

  /** Whether the signed agreement is being uploaded and the contract signed. */
  isSigning = signal<boolean>(false);

  /** Action waiting for confirmation. */
  currentAction = signal<ContractAction | null>(null);

  /** Whether the contract document is being generated. */
  isGenerating = signal<boolean>(false);

  /** Whether a reseller contract template is published. */
  private readonly _hasTemplate = signal<boolean>(false);

  /** Whether the user can edit and sign drafts. */
  readonly canOpen = computed(() => this._permissions.can(Capability.OpenResellerContracts));

  /** Whether the user can end and take back contracts. */
  readonly canEnd = computed(() => this._permissions.can(Capability.EndResellerContracts));

  /** Whether the user can regenerate an expired checkout link. */
  readonly canRefreshCheckout = computed(() => this._permissions.can(Capability.RefreshCheckout));

  /** Whether the draft can be signed: the signed agreement is uploaded with the signature. */
  readonly canSign = computed(() => this.canOpen() && this.contract()?.status === ResellerContractStatus.Draft);

  /** Whether the document can be generated from the draft: the template is published and the user can open drafts. */
  readonly canGenerate = computed(() =>
    this.canOpen() && this.contract()?.status === ResellerContractStatus.Draft && this._hasTemplate());

  /** Whether the terms are read only: past the draft, or without the right to edit them. */
  readonly isReadonly = computed(() => !this.canOpen() || this.contract()?.status !== ResellerContractStatus.Draft);

  /**
   * Constructor that loads the contract.
   */
  constructor() {
    // Load the contract on initialization.
    this._load();

    // Look for the published template once the user is known to open drafts.
    effect(() => {
      if (this.canOpen()) {
        untracked(() => this._loadTemplate());
      }
    });
  }

  /**
   * Whether the options menu has an entry, so the button is rendered only then.
   * @returns true when the menu is not empty.
   */
  hasMenuActions(): boolean {
    const contract = this.contract();
    const status = contract?.status;
    const isOpen = status === ResellerContractStatus.Active || status === ResellerContractStatus.EndedAtRenewal;

    return Boolean(contract?.signedContractS3Key)
      || this.canGenerate()
      || (this.canEnd() && isOpen);
  }

  /**
   * Saves the changed terms of the draft.
   */
  saveDraft(): void {
    const form = this.form();
    if (!form || form.contractForm.invalid) return;

    this._resellerContractsService.updateContract(this._resellerId, this._contractId, form.buildUpdateDto()).subscribe({
      next: (contract) => this.contract.set(contract),
      error: (error) => console.error('Error saving the reseller contract:', error)
    });
  }

  /**
   * Keeps the signed agreement picked in the signing dialog: a PDF of 10 MB at most.
   * @param file the file chosen or dropped.
   */
  onSignedFileSelected(file: File): void {
    if (file.type !== 'application/pdf') {
      this.signedFileError.set('Il contratto firmato deve essere un PDF.');
      return;
    }
    if (file.size > MAX_PDF_SIZE) {
      this.signedFileError.set('Il file supera i 10 MB.');
      return;
    }

    this.signedFileError.set(null);
    this.signedFile.set(file);
  }

  /**
   * Downloads the signed agreement.
   */
  downloadAgreement(): void {
    const s3Key = this.contract()?.signedContractS3Key;
    if (!s3Key) return;
    this._s3UploadService.getDownloadUrl('RESELLER_CONTRACT_SIGNED', s3Key).subscribe(url => openInNewTab(url));
  }

  /**
   * Generates the contract from the draft and opens it, one request at a time.
   */
  generateContract(): void {
    if (this.isGenerating()) return;

    // The tab opens within the click: after the seconds the PDF takes, the browser would block it.
    const tab = window.open('', '_blank');
    this.isGenerating.set(true);
    this._resellerContractsService.getContractDocumentUrl(this._resellerId, this._contractId).pipe(
      finalize(() => this.isGenerating.set(false)),
    ).subscribe({
      next: (url) => {
        if (!tab) {
          openInNewTab(url);
          return;
        }
        tab.opener = null;
        tab.location.href = url;
      },
      error: (error) => {
        tab?.close();
        console.error('Error generating the reseller contract:', error);
      }
    });
  }

  /**
   * Regenerates the expired checkout link.
   */
  refreshCheckout(): void {
    this._resellerContractsService.refreshCheckoutSession(this._resellerId, this._contractId).subscribe({
      next: (contract) => this.contract.set(contract),
      error: (error) => console.error('Error refreshing the checkout session:', error)
    });
  }

  /**
   * Opens the confirmation of an action.
   * @param action the action to confirm.
   */
  openActionDialog(action: ContractAction): void {
    // A dialog closed from its backdrop leaves the file of the last try behind.
    this.signedFile.set(null);
    this.signedFileError.set(null);
    this.currentAction.set(action);
    this.actionDialog()?.open();
  }

  /**
   * Closes the confirmation dialog.
   */
  closeActionDialog(): void {
    this.currentAction.set(null);
    this.actionDialog()?.close();
  }

  /**
   * Runs the confirmed action.
   */
  confirmAction(): void {
    const action = this.currentAction();
    if (action === 'sign') {
      this._sign();
      return;
    }

    this.closeActionDialog();
    const status = action === 'terminate' ? ResellerContractStatus.EndedAtRenewal
        : action === 'reactivate' ? ResellerContractStatus.Active
          : ResellerContractStatus.Ended;
    this._resellerContractsService.updateContract(this._resellerId, this._contractId, { status }).subscribe({
      next: (contract) => this.contract.set(contract),
      error: (error) => console.error('Error changing the status of the reseller contract:', error)
    });
  }

  /**
   * Uploads the signed agreement and signs the draft with it, as an order is accepted with its signed offer.
   */
  private _sign(): void {
    const file = this.signedFile();
    if (!file || this.isSigning()) return;

    this.isSigning.set(true);
    this._s3UploadService.uploadResellerContractPdf(this._resellerId, this._contractId, file).pipe(
      switchMap(signedContractS3Key => this._resellerContractsService.updateContract(this._resellerId, this._contractId, {
        status: ResellerContractStatus.Signed,
        signedContractS3Key,
      })),
      finalize(() => this.isSigning.set(false)),
    ).subscribe({
      next: (contract) => {
        this.contract.set(contract);
        this.closeActionDialog();
      },
      // The failed upload or update is already toasted by the CRUD interceptor.
      error: (error) => console.error('Error signing the reseller contract:', error)
    });
  }

  /**
   * Checks whether a reseller contract template is published.
   */
  private _loadTemplate(): void {
    this._templatesService.resolveTemplate(TemplateType.ResellerContract).subscribe({
      next: (template) => this._hasTemplate.set(Boolean(template)),
      error: (error) => console.error('Error resolving the reseller contract template:', error)
    });
  }

  /**
   * Loads the contract from the route; a contract the user may not read sends it to access denied.
   */
  private _load(): void {
    this._resellerContractsService.getContract(this._resellerId, this._contractId).subscribe({
      next: (contract) => this.contract.set(contract),
      error: (error) => {
        console.error('Error loading the reseller contract:', error);
        this._router.navigate(['/access-denied']);
      }
    });
  }
}
