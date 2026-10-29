import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCopy, lucideDownload, lucideEllipsisVertical, lucideEye, lucideEyeOff, lucideFileUp, lucideSend, lucideUpload } from '@ng-icons/lucide';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { finalize, map, Observable, switchMap } from 'rxjs';
import { CoreResponsePlaceholderCatalogDto, CoreResponseTemplateDto, CoreUpdateTemplateDto } from '../../../../../../../libs/api/src';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { TemplateStatusDirective } from '../../../../directives/template-status.directive';
import { Capability } from '../../../../enums/capability.enum';
import { TemplateFormat } from '../../../../enums/template-format.enum';
import { TemplateStatus } from '../../../../enums/template-status.enum';
import { TemplateType } from '../../../../enums/template-type.enum';
import { SalesChannelPipe } from '../../../../pipes/sales-channel/sales-channel.pipe';
import { TemplateStatusPipe } from '../../../../pipes/template-status/template-status.pipe';
import { TemplateTypePipe } from '../../../../pipes/template-type/template-type.pipe';
import { S3UploadService } from '../../../../services/api-services/s3/s3-upload.service';
import { TemplatesApiService } from '../../../../services/api-services/templates/templates-api.service';
import { DocumentRenderService } from '../../../../services/documents/document-render.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { ToasterService } from '../../../../services/toaster/toaster.service';
import { sampleData } from '../../../../utils/template-data.util';
import { PlaceholderCatalogComponent } from '../../components/placeholder-catalog/placeholder-catalog.component';
import { EditTemplateForm } from '../../interfaces/edit-template-form.interface';
import { fitFrameToContent } from '../../../../utils/fit-frame.util';
import { formChanges } from '../../../../utils/form-changes.util';
import { FileDropZoneDirective } from '../../../../directives/file-drop-zone.directive';

/** Placeholder problems the backend reports when it rejects a template, in its error details. */
type TemplateValidationError = {
  /** Message of the error. */
  message: string;
  /** Error code, e.g. `TEMPLATE_UNKNOWN_PLACEHOLDER`. */
  code?: string;
  /** Placeholders that are not in the catalog. */
  unknown?: string[];
  /** Picture keys written as text. */
  asText?: string[];
  /** Text keys written in the alternative text of an image. */
  asImage?: string[];
  /** Syntax errors of a DOCX source, one per tag. */
  errors?: string[];
};

/** Action waiting for confirmation in the dialog. */
type PendingAction = {
  /** Title of the dialog. */
  title: string;
  /** Explanation of what happens. */
  description: string;
  /** Label of the confirm button. */
  confirmLabel: string;
  /** Request run on confirmation. */
  run: () => Observable<CoreResponseTemplateDto>;
};

/**
 * Page of a single template: the editor while it is a draft, a read-only view afterwards.
 * HTML templates are written in the page, DOCX templates are uploaded; the preview is rendered
 * in the browser with the sample values of the catalog, and nothing generated is stored.
 */
@Component({
  selector: 'rocket-templates-edit',
  imports: [
    ...BrnDialogImports,
    ...HlmBadgeImports,
    ...HlmButtonImports,
    ...HlmDialogImports,
    ...HlmDropdownMenuImports,
    ...HlmInputImports,
    ...HlmLabelImports,
    ...HlmTabsImports,
    ...HlmTextareaImports,
    ...HlmTooltipImports,
    FileDropZoneDirective,
    PageHeaderComponent,
    PlaceholderCatalogComponent,
    TemplateStatusDirective,
    NgIcon,
    ReactiveFormsModule,
    SalesChannelPipe,
    TemplateStatusPipe,
    TemplateTypePipe,
  ],
  providers: [
    provideIcons({
      lucideCopy,
      lucideDownload,
      lucideEllipsisVertical,
      lucideEye,
      lucideEyeOff,
      lucideFileUp,
      lucideSend,
      lucideUpload,
    })
  ],
  templateUrl: './templates-edit.component.html',
})
export class TemplatesEditComponent {
  /** Router instance. */
  private readonly _router = inject(Router);

  /** Activated route instance. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** Templates API service instance. */
  private readonly _templatesApiService = inject(TemplatesApiService);

  /** S3 upload service instance. */
  private readonly _s3UploadService = inject(S3UploadService);

  /** Document render service instance. */
  private readonly _documentRenderService = inject(DocumentRenderService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Toaster service instance. */
  private readonly _toasterService = inject(ToasterService);

  /** DOM sanitizer, to hand the rendered preview to its sandboxed frame. */
  private readonly _sanitizer = inject(DomSanitizer);

  /** Confirmation dialog reference. */
  confirmDialog = viewChild<BrnDialog>('confirmDialog');

  /** Form group for the editable fields. */
  templateForm = new FormGroup<EditTemplateForm>({
    name: new FormControl<string | null>(null, [Validators.required]),
    body: new FormControl<string | null>(null),
  });

  /** Whether the template holds changes to save: a value brought back to where it was is no change. */
  readonly changed = formChanges(this.templateForm);

  /** Template shown in the page. */
  template = signal<CoreResponseTemplateDto | null>(null);

  /** Placeholder catalog of the template scope. */
  catalog = signal<CoreResponsePlaceholderCatalogDto | null>(null);

  /** Problems reported by the backend on the last save or upload. */
  validationError = signal<TemplateValidationError | null>(null);

  /** Action waiting for confirmation. */
  pendingAction = signal<PendingAction | null>(null);

  /** Loading state signal. */
  isLoading = signal<boolean>(false);

  /** View of the HTML body: the code or its preview. */
  bodyView = signal<string>('code');

  /** HTML body in the editor, saved or not, as a signal for the preview. */
  private readonly _body = toSignal(this.templateForm.controls.body.valueChanges, { initialValue: null });

  /** Whether the user can create, edit and publish templates. */
  readonly canManage = computed(() => this._permissions.can(Capability.ManageTemplates));

  /** Whether the template can still be edited: only a draft can. */
  readonly isEditable = computed(() => this.canManage() && this.template()?.status === TemplateStatus.Draft);

  /** Whether the saved template uses at least one placeholder, which its publication needs. */
  readonly usesPlaceholders = computed(() => !!this.template()?.placeholders?.length);

  /** Whether the template is written in HTML rather than uploaded as DOCX. */
  readonly isHtml = computed(() => this.template()?.format === TemplateFormat.Html);

  /**
   * The HTML body filled with the sample values of the catalog, rendered only while the preview is shown.
   * The frame is sandboxed without scripts, so the trusted markup cannot run code; it shares the
   * origin only so that the page can read its height.
   */
  readonly htmlPreview = computed<{ html: SafeHtml } | { error: string } | null>(() => {
    const catalog = this.catalog();
    if (!catalog || !this.isHtml() || this.bodyView() !== 'preview') return null;
    try {
      const html = this._documentRenderService.renderHtml(this._body() ?? this.templateForm.controls.body.value ?? '', sampleData(catalog));
      return { html: this._sanitizer.bypassSecurityTrustHtml(html) };
    } catch (error) {
      return { error: (error as Error).message };
    }
  });

  /** Whether the template can be withdrawn: the contract in force is replaced, never withdrawn. */
  readonly canWithdraw = computed(() => {
    const template = this.template();
    return this.canManage() && template?.status === TemplateStatus.Published && template.type !== TemplateType.Contract;
  });

  /**
   * Constructor of the page component.
   */
  constructor() {
    // Load the template and its catalog.
    this.loadTemplate();
  }

  /**
   * Whether the options menu has an entry, so the button is rendered only then.
   * @returns true when the menu is not empty.
   */
  hasMenuActions(): boolean {
    return (this.isEditable() && this.changed())
      || this.canWithdraw()
      || this.canManage()
      || this.isHtml()
      || Boolean(this.template()?.sourceS3Key);
  }

  /**
   * Loads the template from the route and the catalog of its scope.
   */
  loadTemplate(): void {
    const { type, id } = this._activatedRoute.snapshot.params;
    this._templatesApiService.getTemplate(type, id).pipe(
      switchMap(template => {
        this._setTemplate(template);
        return this._templatesApiService.getPlaceholderCatalog(template.type, template.channel);
      })
    ).subscribe(catalog => this.catalog.set(catalog));
  }

  /**
   * Saves the changed fields of the draft.
   */
  saveTemplate(): void {
    const template = this.template();
    if (!template || !this.templateForm.dirty) return;

    const { name, body } = this.templateForm.controls;
    const templateDto: CoreUpdateTemplateDto = {
      ...(name.dirty ? { name: name.value ?? '' } : {}),
      ...(body.dirty ? { body: body.value ?? '' } : {}),
    };
    this._runUpdate(this._templatesApiService.updateTemplate(template.type, template.id, templateDto));
  }

  /**
   * Takes the DOCX source chosen with the button.
   * @param event the change event of the file input.
   */
  onSourceChosen(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.onSourceSelected(file);
  }

  /**
   * Uploads a new DOCX source on the draft, chosen or dropped; the backend checks its tags before accepting it.
   * @param file the DOCX file.
   */
  onSourceSelected(file: File): void {
    const template = this.template();
    if (!template) return;
    if (!file.name.toLowerCase().endsWith('.docx')) {
      this._toasterService.showError('Il file deve essere un Word (.docx).');
      return;
    }

    this._runUpdate(this._s3UploadService.uploadTemplateSource(template.id, file).pipe(
      switchMap(sourceS3Key => this._templatesApiService.updateTemplate(template.type, template.id, { sourceS3Key }))
    ));
  }

  /**
   * Takes the HTML file chosen from the menu.
   * @param event the change event of the file input.
   */
  onHtmlChosen(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.onHtmlSelected(file);
  }

  /**
   * Replaces the body with the content of an HTML file, chosen or dropped, to be saved afterwards.
   * @param file the HTML file.
   */
  onHtmlSelected(file: File): void {
    if (!/\.html?$/i.test(file.name)) {
      this._toasterService.showError('Il file deve essere un HTML.');
      return;
    }

    file.text().then(body => {
      this.templateForm.controls.body.setValue(body);
      this.templateForm.controls.body.markAsDirty();
    });
  }

  /**
   * Downloads the body as an HTML file, to be edited elsewhere and uploaded again.
   */
  downloadHtml(): void {
    const body = this.templateForm.controls.body.value ?? '';
    this._documentRenderService.download(new Blob([body], { type: 'text/html' }), `${this._fileName()}.html`);
  }

  /**
   * Downloads the DOCX source as uploaded.
   */
  downloadSource(): void {
    const sourceS3Key = this.template()?.sourceS3Key;
    if (!sourceS3Key) return;

    this._documentRenderService.loadFile('TEMPLATE_SOURCE', sourceS3Key).subscribe(source => {
      this._documentRenderService.download(new Blob([source]), `${this._fileName()}.docx`);
    });
  }

  /**
   * Grows the preview frame to the height of its document, so that the page scrolls as it does with the editor.
   * @param event the load event of the frame.
   */
  fitPreview(event: Event): void {
    fitFrameToContent(event);
  }

  /**
   * Fills the DOCX template with the sample values of the catalog and downloads it: a Word file
   * has no preview in the browser, while the HTML one is shown in the page.
   */
  previewDocx(): void {
    const template = this.template();
    const catalog = this.catalog();
    if (!template?.sourceS3Key || !catalog) return;

    this._documentRenderService.loadFile('TEMPLATE_SOURCE', template.sourceS3Key).pipe(
      map(source => this._documentRenderService.renderDocx(source, sampleData(catalog), catalog, true))
    ).subscribe({
      next: document => this._documentRenderService.download(document, `anteprima-${this._fileName()}.docx`),
      error: error => {
        console.error('DOCX preview failed', error);
        this._toasterService.showError('Anteprima non riuscita.');
      },
    });
  }

  /**
   * Asks to publish the draft, which withdraws the template in force for its scope.
   */
  askPublish(): void {
    const template = this.template();
    if (!template) return;

    this._askConfirmation({
      title: 'Pubblicare il template?',
      description: 'Il template verrà attivato per il suo ambito. Non sarà più possibile modificarlo. Il template corrente sarà archiviato.',
      confirmLabel: 'Pubblica',
      run: () => this._templatesApiService.publishTemplate(template.type, template.id),
    });
  }

  /**
   * Asks to withdraw the published template, which leaves its scope without one in force.
   */
  askWithdraw(): void {
    const template = this.template();
    if (!template) return;

    this._askConfirmation({
      title: 'Ritirare il template?',
      description: 'Passa ad «Archiviato» e il suo ambito resta senza template attivo finché non ne pubblichi un altro.',
      confirmLabel: 'Ritira',
      run: () => this._templatesApiService.withdrawTemplate(template.type, template.id),
    });
  }

  /**
   * Runs the action waiting for confirmation.
   */
  confirmPendingAction(): void {
    const action = this.pendingAction();
    if (!action) return;

    this.isLoading.set(true);
    action.run().pipe(
      finalize(() => {
        this.isLoading.set(false);
        this.closeConfirmDialog();
      })
    ).subscribe({
      next: template => this._setTemplate(template),
      error: error => this._captureValidationError(error),
    });
  }

  /**
   * Closes the confirmation dialog.
   */
  closeConfirmDialog(): void {
    this.pendingAction.set(null);
    this.confirmDialog()?.close();
  }

  /**
   * Creates a draft copy of the template and opens it.
   */
  duplicateTemplate(): void {
    const template = this.template();
    if (!template) return;

    this._templatesApiService.duplicateTemplate(template.type, template.id).subscribe(copy => {
      this._router.navigate(['../../', copy.type, copy.id], { relativeTo: this._activatedRoute }).then(() => this.loadTemplate());
    });
  }

  /**
   * Shows a template in the page and in the form, which is read-only unless the template is an editable draft.
   * @param template the template to show.
   */
  private _setTemplate(template: CoreResponseTemplateDto): void {
    this.template.set(template);
    this.templateForm.reset({ name: template.name, body: template.body ?? null });
    if (this.isEditable()) {
      this.templateForm.enable();
    } else {
      this.templateForm.disable();
    }
  }

  /**
   * Runs an update of the template and records the problems the backend reports.
   * @param update$ the update request.
   */
  private _runUpdate(update$: Observable<CoreResponseTemplateDto>): void {
    this.isLoading.set(true);
    this.validationError.set(null);
    update$.pipe(finalize(() => this.isLoading.set(false))).subscribe({
      next: template => this._setTemplate(template),
      error: error => this._captureValidationError(error),
    });
  }

  /**
   * Keeps the placeholder problems of a rejected request, to show them in the page.
   * @param error the error of the request.
   */
  private _captureValidationError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse) || error.status !== 400) return;
    const body = error.error as { message?: string; details?: Omit<TemplateValidationError, 'message'> } | null;
    this.validationError.set({ message: body?.message ?? 'Richiesta rifiutata.', ...(body?.details ?? {}) });
  }

  /**
   * Opens the confirmation dialog for an action.
   * @param action the action to confirm.
   */
  private _askConfirmation(action: PendingAction): void {
    this.validationError.set(null);
    this.pendingAction.set(action);
    this.confirmDialog()?.open();
  }

  /**
   * Returns a file name derived from the template name.
   * @returns the file name, without extension.
   */
  private _fileName(): string {
    return (this.template()?.name ?? 'template').trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'template';
  }
}
