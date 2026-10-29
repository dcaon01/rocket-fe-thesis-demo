import { inject, Injectable, signal } from '@angular/core';
import { Breadcrumb } from '../../interfaces/breadcrumb.interface';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class BreadcrumbsService {
  /** Router instance to detect route changes. */
  private readonly _router = inject(Router);
  
  /** ActivatedRoute instance to access route information. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** Signal representing the current breadcrumbs. */
  breadcrumbs = signal<Breadcrumb[]>([]);

  /**
   * Constructor for BreadcrumbsService.
   * Initializes breadcrumb tracking on route changes.
   */
  constructor() {
    // Update breadcrumbs on every route change
    this._router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateBreadcrumbs();
    });
    
    // Generate initial breadcrumbs after a delay to ensure route is ready
    setTimeout(() => this.updateBreadcrumbs(), 0);
  }

  /**
   * Updates the breadcrumbs signal based on the current route.
   */
  private updateBreadcrumbs(): void {
    const breadcrumbs: Breadcrumb[] = [];
    const routeHierarchy: { route: ActivatedRoute; url: string }[] = [];
    
    // Build the route hierarchy from root to current
    let currentRoute: ActivatedRoute | null = this._activatedRoute.root;
    let url = '';
    
    while (currentRoute) {
      // Check if snapshot exists and has url
      if (currentRoute.snapshot?.url && currentRoute.snapshot.url.length > 0) {
        const routeURL = currentRoute.snapshot.url
          .map(segment => segment.path)
          .join('/');
        url += `/${routeURL}`;
        routeHierarchy.push({ route: currentRoute, url });
      }
      
      currentRoute = currentRoute.firstChild;
    }
    
    // Only show breadcrumbs if we have at least 2 levels (parent + child)
    // if (routeHierarchy.length < 2) {
    //   this.breadcrumbs.set([]);
    //   return;
    // }
    
    // Build breadcrumbs from the hierarchy
    routeHierarchy.forEach((item, index) => {
      const label = item.route.snapshot?.data?.['label'];
      
      if (label && label !== '') {
        const breadcrumb: Breadcrumb = {
          label: label
        };
        
        // Add URL only if it's not the last item
        if (index < routeHierarchy.length - 1) {
          breadcrumb.url = item.url;
        }
        
        breadcrumbs.push(breadcrumb);
      }
    });
    
    this.breadcrumbs.set(breadcrumbs);
  }
}