import { Component, input } from '@angular/core';

@Component({
  selector: 'rocket-page-header',
  imports: [],
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.css'
})
export class PageHeaderComponent {
  /** The title of the page header. */
  headerTitle = input<string>('');

  /** The description text of the page header. */
  description = input<string>('');
}
