import { Component } from '@angular/core';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { UnderConstructionComponent } from '../../../../components/under-construction/under-construction.component';

@Component({
  selector: 'rocket-global-website-metrics',
  imports: [PageHeaderComponent, UnderConstructionComponent],
  templateUrl: './global-website-metrics.component.html',
  styleUrl: './global-website-metrics.component.css'
})
export class GlobalWebsiteMetricsComponent {

}
