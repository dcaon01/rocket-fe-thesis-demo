import { afterRenderEffect, Component, ElementRef, input, signal, viewChild } from '@angular/core';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';

/** Room kept for the badge counting the hidden chips, in pixels. */
const MORE_BADGE_WIDTH = 44;

/** Gap between the chips, in pixels (gap-1.5). */
const CHIPS_GAP = 6;

/**
 * One row of chips that never wraps: it shows the chips that fit, in their order but skipping the ones too long for
 * the room left, and counts the others in a badge.
 * Usage: <rocket-chips-row [labels]="tags()" />
 */
@Component({
  selector: 'rocket-chips-row',
  imports: [...HlmBadgeImports],
  templateUrl: './chips-row.component.html',
  host: { class: 'relative flex-1 min-w-0' },
})
export class ChipsRowComponent {
  /** Labels of the chips. */
  labels = input.required<(string | number)[]>();

  /** Row holding the visible chips. */
  private readonly _row = viewChild.required<ElementRef<HTMLElement>>('row');

  /** Hidden row with every chip, measured to know how many fit. */
  private readonly _measure = viewChild.required<ElementRef<HTMLElement>>('measure');

  /** Indexes of the chips that fit in the row. */
  visible = signal<ReadonlySet<number>>(new Set());

  /**
   * Keeps the chips fitted to the row when the labels or the room change.
   */
  constructor() {
    // Fit the chips after each render and whenever the row is resized.
    afterRenderEffect(onCleanup => {
      this.labels();
      const row = this._row().nativeElement;

      this._fit();

      const observer = new ResizeObserver(() => this._fit());
      observer.observe(row);
      onCleanup(() => observer.disconnect());
    });
  }

  /**
   * Picks the chips that fit in the row, keeping room for the badge of the hidden ones unless every chip fits.
   */
  private _fit(): void {
    const row = this._row().nativeElement;
    const widths = Array.from(this._measure().nativeElement.children).map(chip => (chip as HTMLElement).offsetWidth);
    const total = widths.reduce((sum, width) => sum + width, 0) + CHIPS_GAP * Math.max(widths.length - 1, 0);
    const room = total <= row.clientWidth ? row.clientWidth : row.clientWidth - CHIPS_GAP - MORE_BADGE_WIDTH;

    const visible = new Set<number>();
    let used = 0;
    for (const [index, width] of widths.entries()) {
      const next = used + (visible.size > 0 ? CHIPS_GAP : 0) + width;
      if (next <= room) {
        visible.add(index);
        used = next;
      }
    }

    const current = this.visible();
    if (visible.size !== current.size || [...visible].some(index => !current.has(index))) {
      this.visible.set(visible);
    }
  }
}
