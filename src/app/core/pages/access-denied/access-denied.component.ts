import { Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLockKeyhole } from '@ng-icons/lucide';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';

/**
 * Page shown when the profile guard refuses a route.
 * Exists so that a missing permission reads as a missing permission, instead
 * of a silent redirect to the dashboard that looks like a broken link.
 */
@Component({
  selector: 'rocket-access-denied',
  imports: [NgIcon, RouterLink, ...HlmButtonImports, ...HlmEmptyImports],
  providers: [provideIcons({ lucideLockKeyhole })],
  templateUrl: './access-denied.component.html',
})
export class AccessDeniedComponent {}
