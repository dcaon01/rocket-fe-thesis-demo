import { Component } from '@angular/core';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { UnderConstructionComponent } from '../../../../components/under-construction/under-construction.component';

@Component({
  selector: 'rocket-marketing-metrics',
  imports: [PageHeaderComponent, UnderConstructionComponent],
  templateUrl: './marketing-metrics.component.html',
  styleUrl: './marketing-metrics.component.css'
})
export class MarketingMetricsComponent {

}
