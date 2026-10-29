import { Component, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideInbox } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { CoreResponsePendingOperationDto } from '../../../../../../../libs/api/src';
import { OperationStateDirective } from '../../../../directives/operation-state.directive';
import { OperationKindPipe } from '../../../../pipes/operation-kind/operation-kind.pipe';
import { OperationStatePipe } from '../../../../pipes/operation-state/operation-state.pipe';
import { CollaboratorsApiService } from '../../../../services/api-services/collaborators/collaborators-api.service';

/**
 * History of the operations Rocket sent to the product for a tenant or a user, oldest first,
 * with who asked for each one: an operator, Rocket itself, or the product on its own.
 */
@Component({
  selector: 'rocket-operation-history',
  imports: [
    ...HlmBadgeImports,
    ...HlmEmptyImports,
    ...HlmTableImports,
    NgIcon,
    OperationStateDirective,
    OperationKindPipe,
    OperationStatePipe,
    DatePipe,
  ],
  providers: [provideIcons({ lucideInbox })],
  templateUrl: './operation-history.component.html',
  styleUrl: './operation-history.component.css'
})
export class OperationHistoryComponent {
  /** Collaborators API service instance. */
  private readonly _collaboratorsApiService = inject(CollaboratorsApiService);

  /** Operations of the record. */
  operations = input<CoreResponsePendingOperationDto[]>([]);

  /** Names of the operators who asked for the operations, by Cognito sub; `-` for one that cannot be read. */
  readonly authorNames = signal<Record<string, string>>({});

  /**
   * Constructor of the component.
   */
  constructor() {
    // Resolve the names not read yet whenever the operations change; a newer list drops the older lookup.
    toObservable(this.operations).pipe(
      map(operations => [...new Set(operations.map(operation => operation.requestedBy).filter((sub): sub is string => !!sub))]
        .filter(sub => !(sub in this.authorNames()))),
      switchMap(subs => this._readAuthorNames(subs)),
      takeUntilDestroyed(),
    ).subscribe(names => this.authorNames.update(known => ({ ...known, ...names })));
  }

  /**
   * Tells who asked for an operation.
   * @param operation the operation.
   * @returns the operator's name, the product, or Rocket.
   */
  authorOf(operation: CoreResponsePendingOperationDto): string {
    if (operation.fromProduct) return 'Prodotto';
    if (!operation.requestedBy) return 'Rocket';
    return this.authorNames()[operation.requestedBy] ?? '-';
  }

  /**
   * Reads the names of the operators; one that cannot be read is kept as `-`, so that it is not asked again.
   * @param subs the Cognito subs of the operators.
   * @returns the names by sub.
   */
  private _readAuthorNames(subs: string[]): Observable<Record<string, string>> {
    if (subs.length === 0) return of({});
    return forkJoin(subs.map(sub => this._collaboratorsApiService.getCollaboratorById(sub).pipe(
      map(collaborator => [sub, [collaborator.name, collaborator.familyName].filter(Boolean).join(' ') || collaborator.email] as const),
      catchError(() => of([sub, '-'] as const)),
    ))).pipe(map(entries => Object.fromEntries(entries)));
  }
}
