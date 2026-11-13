import { Pipe, PipeTransform } from '@angular/core';
import { PROFILE_LABELS } from '../../constants/profiles';
import { Profile } from '../../enums/profile.enum';

@Pipe({
  name: 'role'
})
export class RolePipe implements PipeTransform {

  /**
   * Transforms a profile value into its corresponding label.
   * @param value the profile value to transform.
   * @returns the profile label, or a dash when the value is not a known profile.
   */
  transform(value: string): string {
    return PROFILE_LABELS[value as Profile] ?? '-';
  }
}
