import { computed, Signal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl } from '@angular/forms';

/** Tooltip of a section that opens only after the previous ones. */
export const LOCKED_STEP_HINT = 'Selezionabile dopo aver completato le sezioni precedenti';

/** Section of a long form, in the sidebar. */
export interface StepTab {
  /** Identifier, the same as the tab content. */
  id: string;
  /** Label shown in the sidebar. */
  label: string;
  /** Lucide icon name. */
  icon: string;
  /** Whether the section is off because its data is missing. */
  disabled?: boolean;
  /** Reason the section is off, shown in its tooltip. */
  hint?: string;
  /** Whether the section has no field to fill, so the required-field note stays hidden. */
  noFields?: boolean;
}

/** Navigation through the sections of a long form. */
export interface FormSteps {
  /** Id of the section shown. */
  activeTab: Signal<string>;
  /** Whether the sections open one after the other, as in creation. */
  incremental: Signal<boolean>;
  /** Whether the section shown is the last one that can be opened. */
  isLast: Signal<boolean>;
  /** Number of sections that can be opened. */
  count: Signal<number>;
  /** Whether a section comes before the active one. */
  hasPrevious: Signal<boolean>;
  /** Whether the section after the active one can be opened. */
  hasNext: Signal<boolean>;
  /** Why the forward chevron is off, empty while it is on. */
  nextHint: Signal<string>;
  /** Whether every section that can be opened has been shown at least once. */
  allVisited: Signal<boolean>;
  /** Whether the section shown has fields to fill. */
  hasFields: Signal<boolean>;
  /** Shows a section. */
  activate: (id: string) => void;
  /** Shows the section before the active one. */
  previous: () => void;
  /** Shows the section after the active one. */
  next: () => void;
  /** Whether a section is off, for missing data or because the previous ones are still unseen. */
  isDisabled: (tab: StepTab) => boolean;
  /** Tooltip of a section that is off. */
  hintOf: (tab: StepTab) => string;
}

/**
 * Builds the navigation of a long form. When incremental, as in creation, a section opens only once the previous
 * ones have been shown and completed, and the create button waits for allVisited. Call it in an injection context.
 * Usage: <hlm-tabs [tab]="steps.activeTab()" (tabActivated)="steps.activate($event)"> … <rocket-form-toolbar [steps]="form.steps" />
 * @param tabs the sections in order, the disabled ones included.
 * @param incremental whether the sections open one after the other.
 * @param isComplete whether the required fields of a section are filled; it may read signals, to stay reactive.
 * @returns the active section and the commands to move through the sections.
 */
export function formSteps(tabs: Signal<StepTab[]>, incremental: Signal<boolean>, isComplete: (id: string) => boolean = () => true): FormSteps {
  const enabled = computed(() => tabs().filter(tab => !tab.disabled));
  const chosen = signal<string | null>(null);
  const seen = signal<ReadonlySet<string>>(new Set());

  const activeTab = computed(() => chosen() ?? enabled()[0]?.id ?? '');
  const index = computed(() => enabled().findIndex(tab => tab.id === activeTab()));
  const visited = computed(() => new Set([...seen(), activeTab()]));
  const firstUnseen = computed(() => {
    const unseen = enabled().findIndex(tab => !visited().has(tab.id));
    return unseen < 0 ? enabled().length : unseen;
  });
  const firstOpenToFill = computed(() => {
    const blocked = enabled().findIndex(tab => !visited().has(tab.id) || !isComplete(tab.id));
    return blocked < 0 ? enabled().length : blocked;
  });

  const isLocked = (id: string): boolean => {
    const position = enabled().findIndex(tab => tab.id === id);
    return incremental() && position > firstOpenToFill();
  };
  const activate = (id: string): void => {
    seen.update(ids => new Set([...ids, activeTab(), id]));
    chosen.set(id);
  };
  const hasNext = computed(() => index() >= 0 && index() < enabled().length - 1 && !isLocked(enabled()[index() + 1].id));

  return {
    activeTab,
    incremental,
    isLast: computed(() => index() === enabled().length - 1),
    count: computed(() => enabled().length),
    hasPrevious: computed(() => index() > 0),
    hasNext,
    nextHint: computed(() => hasNext() ? '' : index() >= enabled().length - 1
      ? 'Questa è l\'ultima sezione'
      : 'Completa i campi obbligatori'),
    allVisited: computed(() => !incremental() || firstUnseen() === enabled().length),
    hasFields: computed(() => !enabled()[index()]?.noFields),
    activate,
    previous: () => {
      if (index() > 0) activate(enabled()[index() - 1].id);
    },
    next: () => {
      if (hasNext()) activate(enabled()[index() + 1].id);
    },
    isDisabled: tab => !!tab.disabled || isLocked(tab.id),
    hintOf: tab => (tab.disabled ? tab.hint ?? '' : LOCKED_STEP_HINT),
  };
}

/**
 * Builds the completion of the sections of a form for formSteps: a section is complete when none of its controls is
 * invalid. It follows every status the form emits, the same one again included, so a section completes even while the
 * rest of the form stays invalid. Call it in an injection context, once the form exists.
 * Usage: formSteps(this.tabs, this.creating, sectionsComplete(this.productForm, { info: ['name'], … }))
 * @param form the form.
 * @param sections the top-level controls of each section, by section id; a section left out is always complete.
 * @returns whether a section is complete.
 */
export function sectionsComplete(form: AbstractControl, sections: Record<string, string[]>): (id: string) => boolean {
  const status = toSignal(form.statusChanges, { initialValue: form.status, equal: () => false });
  return id => {
    status();
    return (sections[id] ?? []).every(name => !form.get(name)?.invalid);
  };
}
