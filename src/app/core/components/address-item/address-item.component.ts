import { Component, computed, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMapPin } from '@ng-icons/lucide';

/**
 * Read-only postal address: the street, then postcode, city, province and country on one line.
 * Usage: <rocket-address-item [street]="street" [zipCode]="zipCode" [city]="city" [province]="province" [country]="country" />
 */
@Component({
  selector: 'rocket-address-item',
  imports: [NgIcon],
  providers: [provideIcons({ lucideMapPin })],
  templateUrl: './address-item.component.html',
  host: { class: 'flex items-start gap-3 min-w-0' },
})
export class AddressItemComponent {
  /** Street and number. */
  street = input<string | null | undefined>();

  /** Postcode. */
  zipCode = input<string | null | undefined>();

  /** City. */
  city = input<string | null | undefined>();

  /** Province code. */
  province = input<string | null | undefined>();

  /** Country code. */
  country = input<string | null | undefined>();

  /** Postcode, city, province and country, joined on the second line. */
  readonly locality = computed(() => {
    const place = [this.zipCode(), this.city(), this.province() ? `(${this.province()})` : null].filter(Boolean).join(' ');

    return [place, this.country()].filter(Boolean).join(', ');
  });
}
