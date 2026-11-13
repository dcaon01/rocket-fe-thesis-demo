import { DatePipe } from '@angular/common';
import { Component, computed, effect, input, signal, untracked } from '@angular/core';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { TrialStatusDirective } from '../../../../directives/trial-status.directive';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { provideIcons } from '@ng-icons/core';
import { lucideCalendarClock, lucideMail, lucideUsers } from '@ng-icons/lucide';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmDatePickerImports } from '@spartan-ng/helm/date-picker';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmSwitchImports } from '@spartan-ng/helm/switch';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { CoreResponseTrialDto } from '../../../../../../../libs/api/src';
import { TrialStatus } from '../../../../enums/trial-status.enum';
import { UsersLimitType } from '../../../../enums/users-limit-type.enum';
import { TrialStatusPipe } from '../../../../pipes/trial-status/trial-status.pipe';
import { CreateEditTrialForm } from '../../interfaces/create-edit-trial-form.interface';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { formSteps, sectionsComplete, StepTab } from '../../../../utils/form-steps.util';
import { formChanges } from '../../../../utils/form-changes.util';
import { StepListComponent } from '../../../../components/step-list/step-list.component';

@Component({
  selector: 'rocket-trial-form',
  imports: [
    ...HlmBadgeImports,
    ...HlmSelectImports,
    ...HlmInputImports,
    ...HlmLabelImports,
    ...BrnSelectImports,
    ...HlmDatePickerImports,
    ...HlmCheckboxImports,
    ...HlmSwitchImports,
    ...HlmTextareaImports,
    ReactiveFormsModule,
    TrialStatusPipe,
    DatePipe,
    ...HlmTabsImports,
    ...HlmCardImports,
    ...HlmButtonImports,
    ...HlmTooltipImports,
    StepListComponent,
    TrialStatusDirective,
  ],
  providers: [
    provideIcons({
      lucideCalendarClock,
      lucideMail,
      lucideUsers
    }),
  ],
  templateUrl: './trial-form.component.html',
  styleUrl: './trial-form.component.css'
})
export class TrialFormComponent {

  /** Trial data to edit. */
  trialData = input<CoreResponseTrialDto | undefined>(undefined);

  /** Whether the form shows a new record, whose sections open one after the other. */
  creating = input<boolean>(false);

  /** Whether the form is shown read-only, to users who cannot edit trials. */
  readonly = input<boolean>(false);

  /** List of available trial statuses. */
  trialStatus = Object.values(TrialStatus);

  /** List of available users limit types. */
  usersLimitTypes: UsersLimitType[] = Object.values(UsersLimitType);

  /** Whether the form fields are read-only (for expired or draft trials). */
  isReadonly = signal(false);

  /** Whether description and status can still change: not for read-only users, draft or converted trials; otherwise they show as text. */
  isEditable = computed(() => !this.readonly() && this.trialData()?.status !== TrialStatus.Draft && this.trialData()?.status !== TrialStatus.Converted);

  /** Whether the expiration date can still change: never on a perpetual trial. */
  isExpirationEditable = computed(() => this.isEditable() && !this.trialData()?.perpetual);

  /** Whether the email and the users limit can change: they are set at creation only. */
  isCreationFieldEditable = computed(() => !this.readonly() && !this.trialData());

  /** Whether the users limit type can change: at creation and on draft trials only. */
  isUsersLimitTypeEditable = computed(() => !this.readonly() && (!this.trialData() || this.trialData()?.status === TrialStatus.Draft));

  /** Error message for expiration date validation on reactivation. */
  expiresAtError = signal<string | null>(null);

  /** Form group for creating or editing a trial. */
  trialForm = new FormGroup<CreateEditTrialForm>({
    associatedEmail: new FormControl<string | null>(null, [Validators.required, Validators.email]),
    description: new FormControl<string | null>(null),
    hasCustomExpiration: new FormControl<boolean | null>(false),
    expiresAt: new FormControl<Date | null>({ value: null, disabled: true }),
    perpetual: new FormControl<boolean | null>(false),
    status: new FormControl<TrialStatus | null>(null),
    usersLimitType: new FormControl<UsersLimitType | null>(UsersLimitType.Product, [Validators.required]),
    usersLimit: new FormControl<number | null>({ value: null, disabled: true }),
  });

  /** Ordered definition of the form sections shown in the sidebar navigation. */
  readonly tabs: StepTab[] = [
    { id: 'destinatario', label: 'Destinatario', icon: 'lucideMail' },
    { id: 'durata', label: 'Durata', icon: 'lucideCalendarClock' },
    { id: 'utenze', label: 'Utenze', icon: 'lucideUsers' },
  ];

  /** Navigation through the sections, one after the other while creating, each once its required fields are valid. */
  readonly steps = formSteps(signal(this.tabs), this.creating, sectionsComplete(this.trialForm, {
    destinatario: ['associatedEmail', 'description'],
    durata: ['hasCustomExpiration', 'expiresAt', 'perpetual', 'status'],
    utenze: ['usersLimitType', 'usersLimit'],
  }));

  /** Whether the form holds changes to save: a value brought back to where it was is no change. */
  readonly changed = formChanges(this.trialForm);

  /**
   * Constructor to initialize effects for populating the form.
   */
  constructor() {
    // Toggle usersLimit enable/disable based on usersLimitType
    this.trialForm.get('usersLimitType')!.valueChanges.pipe(takeUntilDestroyed())
      .subscribe(type => {
        const usersLimitControl = this.trialForm.get('usersLimit')!;
        if (type === UsersLimitType.Custom) {
          usersLimitControl.enable();
          usersLimitControl.setValidators([Validators.required, Validators.min(0)]);
        } else {
          usersLimitControl.disable();
          usersLimitControl.setValue(null);
          usersLimitControl.clearValidators();
        }
        usersLimitControl.updateValueAndValidity();
      });

    /** Effect to populate the form when trialData changes. */
    effect(() => {
      const trial = this.trialData();
      if (trial) {
        this.trialForm.patchValue({
          associatedEmail: trial.associatedEmail,
          description: trial.description ?? null,
          hasCustomExpiration: !!trial.expiresAt,
          expiresAt: trial.expiresAt ? new Date(trial.expiresAt) : null,
          perpetual: trial.perpetual ?? false,
          status: trial.status as TrialStatus,
          usersLimitType: trial.usersLimitType as UsersLimitType,
          usersLimit: trial.usersLimit ?? null,
        });

        // Perpetual is read-only in edit mode (can only be set at creation)
        this.trialForm.get('perpetual')?.disable();

        // In edit mode, add status validator and enable expiresAt (unless perpetual)
        this.trialForm.get('status')?.setValidators([Validators.required]);
        if (!trial.perpetual) {
          this.trialForm.get('expiresAt')?.enable();
        }

        // Disable email in edit mode (can't be changed)
        this.trialForm.get('associatedEmail')?.disable();

        // Users limit can only be changed in draft mode
        if (trial.status !== TrialStatus.Draft) {
          this.trialForm.get('usersLimitType')?.disable();
          this.trialForm.get('usersLimit')?.disable();
        }

        // If trial is draft, disable all fields
        if (trial.status === TrialStatus.Draft) {
          this.isReadonly.set(true);
          this.trialForm.get('expiresAt')?.disable();
          this.trialForm.get('status')?.disable();
        }

        // If trial is cancelled, allow reactivation with statuses [CANCELLED, ACTIVE]
        if (trial.status === TrialStatus.Cancelled) {
          this.isReadonly.set(true);
          this.trialStatus = [TrialStatus.Cancelled, TrialStatus.Active];
        }

        // If trial is expired, allow reactivation with statuses [EXPIRED, ACTIVE]
        if (trial.status === TrialStatus.Expired) {
          this.isReadonly.set(true);
          this.trialStatus = [TrialStatus.Expired, TrialStatus.Active];
        }

        // A converted trial lives on as the tenant of an order: nothing changes any more.
        if (trial.status === TrialStatus.Converted) {
          this.isReadonly.set(true);
          this.trialStatus = [TrialStatus.Converted];
          this.trialForm.get('expiresAt')?.disable();
          this.trialForm.get('status')?.disable();
        }

        // Filter available statuses based on current trial status
        if (trial.status === TrialStatus.Active) {
          this.trialStatus = this.trialStatus.filter((status) => {
            return status === TrialStatus.Active || status === TrialStatus.Cancelled;
          });
        }
      }

      this.trialForm.updateValueAndValidity();
    });

    // Freeze the whole form for read-only users, after the data has been applied.
    effect(() => {
      this.trialData();
      if (this.readonly()) {
        untracked(() => {
          this.isReadonly.set(true);
          this.trialForm.disable({ emitEvent: false });
        });
      }
    });

    // Enable/disable expiresAt based on the custom expiration toggle.
    this.trialForm.get('hasCustomExpiration')?.valueChanges.pipe(takeUntilDestroyed())
      .subscribe((value) => {
        const expiresAt = this.trialForm.get('expiresAt');
        if (value) {
          expiresAt?.enable();
        } else {
          expiresAt?.reset();
          expiresAt?.disable();
        }
      });

    // When perpetual is toggled on, disable expiration date fields (create mode only).
    this.trialForm.get('perpetual')?.valueChanges.pipe(takeUntilDestroyed())
      .subscribe((value) => {
        if (value) {
          this.trialForm.get('hasCustomExpiration')?.setValue(false);
          this.trialForm.get('hasCustomExpiration')?.disable();
          this.trialForm.get('expiresAt')?.reset();
          this.trialForm.get('expiresAt')?.disable();
        } else {
          this.trialForm.get('hasCustomExpiration')?.enable();
        }
      });

    // When status changes to ACTIVE from CANCELLED or EXPIRED, enable expiresAt and validate.
    this.trialForm.get('status')?.valueChanges.pipe(takeUntilDestroyed())
      .subscribe((status) => {
        const trial = this.trialData();
        if (!trial || (trial.status !== TrialStatus.Cancelled && trial.status !== TrialStatus.Expired)) return;

        if (status === TrialStatus.Active) {
          this.isReadonly.set(false);
          // Perpetual trials don't need expiration date on reactivation
          if (!trial.perpetual) {
            this.trialForm.get('expiresAt')?.enable();
            this._validateExpiresAtForReactivation();
          }
        } else {
          this.isReadonly.set(true);
          if (!trial.perpetual) {
            this.trialForm.get('expiresAt')?.disable();
          }
          this.expiresAtError.set(null);
        }
      });

    // Validate expiresAt on every change during reactivation.
    this.trialForm.get('expiresAt')?.valueChanges.pipe(takeUntilDestroyed())
      .subscribe(() => {
        const trial = this.trialData();
        const isReactivating = (trial?.status === TrialStatus.Cancelled || trial?.status === TrialStatus.Expired)
          && this.trialForm.get('status')?.value === TrialStatus.Active;
        if (isReactivating) {
          this._validateExpiresAtForReactivation();
        }
      });
  }

  /**
   * Validates the expiresAt date for trial reactivation.
   * The new expiration date must be after both today and the original expiration date.
   */
  private _validateExpiresAtForReactivation(): void {
    const expiresAt = this.trialForm.get('expiresAt')?.value;
    const trial = this.trialData();

    if (!expiresAt) {
      this.expiresAtError.set('La data di scadenza è obbligatoria per riattivare il trial.');
      this.trialForm.get('expiresAt')?.setErrors({ required: true });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selectedDate = new Date(expiresAt);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate <= today) {
      this.expiresAtError.set('La data di scadenza deve essere successiva alla data odierna.');
      this.trialForm.get('expiresAt')?.setErrors({ invalidDate: true });
      return;
    }

    if (trial?.expiresAt) {
      const originalExpiration = new Date(trial.expiresAt);
      originalExpiration.setHours(0, 0, 0, 0);

      if (selectedDate <= originalExpiration) {
        this.expiresAtError.set('La data di scadenza deve essere successiva a quella originale (' + this.formatDate(originalExpiration) + ').');
        this.trialForm.get('expiresAt')?.setErrors({ invalidDate: true });
        return;
      }
    }

    this.expiresAtError.set(null);
    this.trialForm.get('expiresAt')?.setErrors(null);
  }

  /**
   * Formats a date to dd/mm/yyyy string.
   * @param date the date to format.
   * @returns the formatted date string.
   */
  formatDate(date: Date | null): string {
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    return `${day}/${month}/${year}`;
  }
}
