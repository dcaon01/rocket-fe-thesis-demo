import { Component, computed, input } from '@angular/core';
import { HlmCard } from '@spartan-ng/helm/card';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';

/**
 * Placeholders of a row of KPI cards while their figures load, with the size of the real cards so the page does not
 * jump when they arrive. The host takes no box: the cards sit in the grid of the row.
 * Usage: <rocket-kpi-skeletons [count]="4" />
 */
@Component({
  selector: 'rocket-kpi-skeletons',
  imports: [...HlmSkeletonImports, HlmCard],
  host: { class: 'contents' },
  templateUrl: './kpi-skeletons.component.html',
})
export class KpiSkeletonsComponent {
  /** Number of cards of the row. */
  count = input<number>(4);

  /** Positions of the cards, for the loop of the template. */
  readonly cards = computed(() => Array.from({ length: this.count() }, (_, index) => index));
}
