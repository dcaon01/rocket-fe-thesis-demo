import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { lucideFileCode, lucideFileText, lucideShapes, lucideTag } from '@ng-icons/lucide';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { CoreCreateTemplateDto } from '../../../../../../../libs/api/src';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { SalesChannel } from '../../../../enums/sales-channel.enum';
import { TemplateType } from '../../../../enums/template-type.enum';
import { SalesChannelPipe } from '../../../../pipes/sales-channel/sales-channel.pipe';
import { TemplateTypePipe } from '../../../../pipes/template-type/template-type.pipe';
import { TemplatesApiService } from '../../../../services/api-services/templates/templates-api.service';
import { CreateTemplateForm } from '../../interfaces/create-template-form.interface';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { formSteps, sectionsComplete, StepTab } from '../../../../utils/form-steps.util';
import { StepListComponent } from '../../../../components/step-list/step-list.component';
import { FormToolbarComponent } from '../../../../components/form-toolbar/form-toolbar.component';

/**
 * Page that creates a template draft from its type and scope.
 * The content is written afterwards, in the template page the creation leads to.
 */
@Component({
  selector: 'rocket-templates-create',
  imports: [
    ...BrnSelectImports,
    ...HlmButtonImports,
    ...HlmInputImports,
    ...HlmLabelImports,
    ...HlmSelectImports,
    PageHeaderComponent,
    ReactiveFormsModule,
    SalesChannelPipe,
    TemplateTypePipe,
    ...HlmTabsImports,
    ...HlmCardImports,
    ...HlmTooltipImports,
    StepListComponent,
    FormToolbarComponent,
  ],
  providers: [provideIcons({
      lucideFileCode,
      lucideFileText,
      lucideShapes,
      lucideTag
    })],
  templateUrl: './templates-create.component.html',
})
export class TemplatesCreateComponent {
  /** Router instance. */
  private readonly _router = inject(Router);

  /** Activated route instance. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** Templates API service instance. */
  private readonly _templatesApiService = inject(TemplatesApiService);

  /** Template types. */
  templateTypes = Object.values(TemplateType);

  /** Sales channels. */
  salesChannels = Object.values(SalesChannel);

  /** Form group for the new template. */
  templateForm = new FormGroup<CreateTemplateForm>({
    type: new FormControl<TemplateType | null>(this._initialType(), [Validators.required]),
    channel: new FormControl<SalesChannel | null>(null),
    name: new FormControl<string | null>(null, [Validators.required]),
  });

  /** Ordered definition of the form sections shown in the sidebar navigation. */
  readonly tabs: StepTab[] = [
    { id: 'tipo', label: 'Tipo', icon: 'lucideShapes' },
    { id: 'nome', label: 'Nome', icon: 'lucideTag' },
  ];

  /** Navigation through the sections, one after the other while creating. */
  readonly steps = formSteps(signal(this.tabs), computed(() => true), sectionsComplete(this.templateForm, { tipo: ['type', 'channel'], nome: ['name'] }));

  /**
   * Constructor of the page component.
   */
  constructor() {
    // Require the scope the selected type is bound to.
    this._applyScopeValidators(this.templateForm.value.type ?? null);
    this.templateForm.controls.type.valueChanges.pipe(takeUntilDestroyed())
      .subscribe(type => this._applyScopeValidators(type));
  }

  /**
   * Creates the draft and opens it.
   */
  createTemplate(): void {
    const value = this.templateForm.getRawValue();
    const templateDto: CoreCreateTemplateDto = {
      type: value.type!,
      name: value.name!,
      ...(value.type === TemplateType.Offer ? { channel: value.channel! } : {}),
    };

    this._templatesApiService.createTemplate(templateDto).subscribe(template => {
      this._router.navigate(['../edit', template.type, template.id], { relativeTo: this._activatedRoute });
    });
  }

  /**
   * Reads the type preset by the list page.
   * @returns the type, or null when none is preset.
   */
  private _initialType(): TemplateType | null {
    const type = this._activatedRoute.snapshot.queryParamMap.get('type');
    return Object.values(TemplateType).includes(type as TemplateType) ? type as TemplateType : null;
  }

  /**
   * Makes the channel required for offers, clearing it for the other types.
   * @param type the selected type.
   */
  private _applyScopeValidators(type: TemplateType | null): void {
    const { channel } = this.templateForm.controls;
    channel.clearValidators();
    if (type === TemplateType.Offer) {
      channel.setValidators([Validators.required]);
    } else {
      channel.setValue(null);
    }
    channel.updateValueAndValidity();
  }
}
