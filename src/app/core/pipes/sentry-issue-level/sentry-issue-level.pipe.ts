import { Pipe, PipeTransform } from '@angular/core';
import { SentryIssueLevel } from '../../enums/sentry-issue-level.enum';

/**
 * Pipe that translates the level of a Sentry issue into its label.
 */
@Pipe({
  name: 'sentryIssueLevel'
})
export class SentryIssueLevelPipe implements PipeTransform {

  /**
   * Transforms a Sentry issue level into its corresponding label.
   * @param value the level to transform.
   * @returns the level label.
   */
  transform(value: string): string {
    switch (value) {
      case SentryIssueLevel.Fatal:
        return 'Fatale';
      case SentryIssueLevel.Error:
        return 'Errore';
      case SentryIssueLevel.Warning:
        return 'Avviso';
      case SentryIssueLevel.Info:
        return 'Info';
      case SentryIssueLevel.Debug:
        return 'Debug';
      default:
        return value;
    }
  }
}
