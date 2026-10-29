import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { provideIcons } from '@ng-icons/core';
import { lucideUserRound } from '@ng-icons/lucide';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { CognitoCognitoUserResponseDto } from '../../../../../../../libs/api/src';
import { AccountType } from '../../../../enums/account-type.enum';
import { PROFILE_ACCOUNT_TYPE } from '../../../../constants/profiles';
import { Profile } from '../../../../enums/profile.enum';
import { RolePipe } from '../../../../pipes/roles/role.pipe';
import { S3UploadService } from '../../../../services/api-services/s3/s3-upload.service';
import { CreateEditCollaboratorForm } from '../../interfaces/create-edit-collaborator-form.interface';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { formSteps, sectionsComplete, StepTab } from '../../../../utils/form-steps.util';
import { formChanges } from '../../../../utils/form-changes.util';
import { StepListComponent } from '../../../../components/step-list/step-list.component';
import { CopyButtonComponent } from '../../../../components/copy-button/copy-button.component';

/**
 * Component for the collaborator form used in creating or editing collaborators.
 */
@Component({
  selector: 'rocket-collaborator-form',
  imports: [
    ...HlmAvatarImports,
    ...HlmLabelImports,
    ...HlmInputImports,
    ...HlmSelectImports,
    ...BrnSelectImports,
    ReactiveFormsModule,
    RolePipe,
    ...HlmTabsImports,
    ...HlmCardImports,
    ...HlmButtonImports,
    ...HlmTooltipImports,
    StepListComponent,
    CopyButtonComponent,
  ],
  providers: [
    provideIcons({
      lucideUserRound
    }),
  ],
  templateUrl: './collaborator-form.component.html',
  styleUrl: './collaborator-form.component.css'
})
export class CollaboratorFormComponent {
  /** S3 Upload Service. */
  private readonly _s3UploadService = inject(S3UploadService);

  /** Signal to hold collaborator data for the create collaborator form. */
  collaboratorData = input<CognitoCognitoUserResponseDto | undefined>(undefined);

  /** Whether the form shows a new record, whose sections open one after the other. */
  creating = input<boolean>(false);

  /** Account type of a new collaborator, decided by the area the page belongs to. */
  accountType = input<AccountType>(AccountType.Collaborator);

  /** Presigned download URL for the collaborator avatar. */
  avatarUrl = signal<string | null>(null);

  /** Initials of the saved collaborator, shown when there is no photo. */
  initials = computed(() => {
    const data = this.collaboratorData();
    return `${data?.name?.charAt(0) ?? ''}${data?.familyName?.charAt(0) ?? ''}`.toUpperCase() || '?';
  });

  /** Whether the email can be edited: it is locked once the collaborator exists. */
  isEmailEditable = computed(() => !this.collaboratorData());

  /** Form group for creating a new collaborator. */
  collaboratorForm = new FormGroup<CreateEditCollaboratorForm>({
    name: new FormControl<string | null>(null, [Validators.required]),
    familyName: new FormControl<string | null>(null, [Validators.required]),
    email: new FormControl<string | null>(null, [Validators.required, Validators.email]),
    enabled: new FormControl<boolean>(true, [Validators.required]),
    profile: new FormControl<Profile | null>(null, [Validators.required]),
  });

  /** Ordered definition of the form sections shown in the sidebar navigation. */
  readonly tabs: StepTab[] = [
    { id: 'identita', label: 'Identità', icon: 'lucideUserRound' },
  ];

  /** Navigation through the sections, one after the other while creating, each once its required fields are valid. */
  readonly steps = formSteps(signal(this.tabs), this.creating, sectionsComplete(this.collaboratorForm, {
    identita: ['name', 'familyName', 'email', 'enabled', 'profile'],
  }));

  /** Whether the form holds changes to save: a value brought back to where it was is no change. */
  readonly changed = formChanges(this.collaboratorForm);

  /** Profiles of the account type of the collaborator: the saved one, or the one of the area for a new one. */
  availableRoles = computed(() => {
    const accountType = (this.collaboratorData()?.accountType as AccountType | undefined) ?? this.accountType();
    return (Object.values(Profile) as Profile[]).filter(profile => PROFILE_ACCOUNT_TYPE[profile] === accountType);
  });

  /**
   * Constructor that initializes the component and sets up the 
   * effect to populate the form if collaborator data is provided.
   */
  constructor() {
    // Populate the form with the saved collaborator.
    effect(() => {
      const collaboratorData = this.collaboratorData();
      if (collaboratorData) {
        this.collaboratorForm.setValue({
          name: collaboratorData.name || null,
          familyName: collaboratorData.familyName || null,
          enabled: collaboratorData.enabled,
          email: collaboratorData.email || null,
          profile: (collaboratorData.groups?.[0] as Profile | undefined) ?? null
        });

        this.collaboratorForm.get('email')?.disable();
      }
    });

    // Load presigned URL for collaborator avatar.
    effect(() => {
      const s3Key = this.collaboratorData()?.profilePicS3Key;
      if (!s3Key) {
        this.avatarUrl.set(null);
        return;
      }

      this._s3UploadService.getDownloadUrlCognito(s3Key).subscribe(url => {
        this.avatarUrl.set(url);
      });
    });
  }
}
