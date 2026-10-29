import { Component } from '@angular/core';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { UnderConstructionComponent } from '../../../../components/under-construction/under-construction.component';

@Component({
  selector: 'rocket-global-marketing-metrics',
  imports: [PageHeaderComponent, UnderConstructionComponent],
  templateUrl: './global-marketing-metrics.component.html',
  styleUrl: './global-marketing-metrics.component.css'
})
export class GlobalMarketingMetricsComponent {

}
