import { Component } from '@angular/core';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { UnderConstructionComponent } from '../../../../components/under-construction/under-construction.component';

@Component({
  selector: 'rocket-website-metrics',
  imports: [PageHeaderComponent, UnderConstructionComponent],
  templateUrl: './website-metrics.component.html',
  styleUrl: './website-metrics.component.css'
})
export class WebsiteMetricsComponent {

}
