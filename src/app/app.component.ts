import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { filter, map, takeWhile } from 'rxjs';
import { LoadingOverlayComponent } from './core/components/loading-overlay/loading-overlay.component';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    LoadingOverlayComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  /** Router instance used to follow the navigation state. */
  private readonly _router = inject(Router);

  /** Application title. */
  title = 'rocket-fe';

  /**
   * Whether the first navigation is in flight. The session guard asks Cognito before
   * any route renders, so without this the first load shows a blank page. Later
   * navigations happen inside the layout, whose content has its own overlay.
   */
  isNavigating = toSignal(
    this._router.events.pipe(
      filter(event =>
        event instanceof NavigationStart
        || event instanceof NavigationEnd
        || event instanceof NavigationCancel
        || event instanceof NavigationError
      ),
      map(event => event instanceof NavigationStart),
      takeWhile(navigating => navigating, true)
    ),
    { initialValue: true }
  );
}
