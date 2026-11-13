import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'resellerOwner'
})
export class ResellerOwnerPipe implements PipeTransform {

  /**
   * Extracts the direct owner code from a reseller materialized path.
   * @param resellerPath the path (e.g. "RVD-001#RVD-002#"), segments separated by '#'.
   * @returns the last non-empty segment (direct owner), or null for Keus-owned records.
   */
  transform(resellerPath: string | null | undefined): string | null {
    if (!resellerPath) {
      return null;
    }
    const segments = resellerPath.split('#').filter(segment => segment.length > 0);
    return segments.length ? segments[segments.length - 1] : null;
  }

}
