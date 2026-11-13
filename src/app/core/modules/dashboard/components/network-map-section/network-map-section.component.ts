import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideInbox, lucideX } from '@ng-icons/lucide';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCard } from '@spartan-ng/helm/card';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import type { ECElementEvent, EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import { CoreResponseResellerNetworkEntryDto } from '../../../../../../../libs/api/src';
import { NetworkCacheService } from '../../../../services/cache/network-cache.service';
import { GeoMapService, ITALY_PROVINCES_MAP, ITALY_REGIONS_MAP, ItalyMaps } from '../../../../services/geo-map/geo-map.service';
import { ChartTheme, readChartTheme } from '../../../../utils/chart-theme.util';
import { MapLevel } from '../../enums/map-level.enum';
import { Period } from '../../enums/period.enum';

/** Resellers and licenses of an area on the map, a province or a region. */
interface AreaCount {
  /** Resellers with the legal address in the area. */
  resellers: number;
  /** Licenses those resellers activated in the period. */
  licenses: number;
}

/**
 * Rete dei rivenditori section of the global dashboard (UR-RK-001): the resellers with the fee in force on the map of
 * the provinces or of the regions, colored by the licenses activated in the month or in the year, and the table that
 * opens their workspace. A click on an area narrows the table to it, and more areas can be selected together.
 */
@Component({
  selector: 'rocket-network-map-section',
  imports: [
    ...HlmSkeletonImports,
    ...BrnSelectImports,
    ...HlmButtonImports,
    ...HlmEmptyImports,
    ...HlmSelectImports,
    ...HlmTableImports,
    HlmCard,
    NgIcon,
    NgxEchartsDirective,
    RouterLink,
  ],
  viewProviders: [provideIcons({ lucideInbox, lucideX })],
  templateUrl: './network-map-section.component.html',
})
export class NetworkMapSectionComponent {
  /** Network cache service instance. */
  private readonly _networkCacheService = inject(NetworkCacheService);

  /** Geo map service instance. */
  private readonly _geoMapService = inject(GeoMapService);

  /** Chart colors, read from the CSS tokens. */
  private _chart: ChartTheme = readChartTheme();

  /** Names of the provinces and regions, null until the maps are registered. */
  private readonly _maps = signal<ItalyMaps | null>(null);

  /** ECharts option for the map of the areas. */
  mapOption: EChartsOption | null = null;

  /** Resellers with the fee in force. */
  private readonly _entries = signal<CoreResponseResellerNetworkEntryDto[]>([]);

  /** Time mode of the section. */
  networkTime = signal<Period>(Period.Monthly);

  /** Geographic detail of the map. */
  mapLevel = signal<MapLevel>(MapLevel.Region);

  /** Areas the table is narrowed to, the province codes or the region names; empty for every area. */
  selectedAreas = signal<string[]>([]);

  /** Resellers of the table: those of the selected areas only, the most licenses first. */
  readonly shownResellers = computed(() => {
    const areas = this.selectedAreas();
    return this._entries()
      .filter(entry => areas.length === 0 || areas.includes(this._areaOf(entry) ?? ''))
      .sort((a, b) => b.licensesActivated - a.licensesActivated || a.companyName.localeCompare(b.companyName));
  });

  /** Plural of the current detail, for the titles and the buttons. */
  readonly levelPlural = computed(() => this.mapLevel() === MapLevel.Province ? 'province' : 'regioni');

  /** Title of the table: every area, or the areas selected on the map. */
  readonly tableTitle = computed(() => {
    const plural = this.levelPlural();
    return this.selectedAreas().length > 0 ? `${plural.charAt(0).toUpperCase()}${plural.slice(1)} selezionate` : `Tutte le ${plural}`;
  });

  /** Whether the figures of the current selection are still loading, so the placeholders show. */
  isLoading = signal<boolean>(true);

  /**
   * Constructor of the component.
   */
  constructor() {
    // Register the maps of the provinces and regions once, then draw it.
    this._geoMapService.registerItalyMaps().then(maps => {
      this._maps.set(maps);
      this._buildMap();
    }).catch((error: unknown) => console.error('Error loading the maps of the provinces and regions:', error));

    // Read the network.
    this._chart = readChartTheme();
    this._load();
  }

  /**
   * Handles the time selector change and reads the licenses of the new mode.
   * @param value the selected time mode ('MONTHLY' or 'ANNUAL').
   */
  onNetworkTimeChange(value: string): void {
    this.networkTime.set(value as Period);
    this._load();
  }

  /**
   * Switches the map between provinces and regions, dropping the selection since its areas no longer exist.
   * @param value the selected detail ('PROVINCE' or 'REGION').
   */
  onMapLevelChange(value: string): void {
    this.mapLevel.set(value as MapLevel);
    this.selectedAreas.set([]);
    this._buildMap();
  }

  /**
   * Adds the area clicked on the map to the selection, or removes it on a second click.
   * @param event the click event of the map.
   */
  onMapClick(event: ECElementEvent): void {
    this.selectedAreas.update(areas =>
      areas.includes(event.name) ? areas.filter(area => area !== event.name) : [...areas, event.name]);
    this._buildMap();
  }

  /**
   * Clears the selection and widens the table to every area.
   */
  clearAreas(): void {
    this.selectedAreas.set([]);
    this._buildMap();
  }

  /**
   * Names the region of a reseller, for the table.
   * @param entry the reseller.
   * @returns the region name, or null when the province is missing or unknown.
   */
  regionOf(entry: CoreResponseResellerNetworkEntryDto): string | null {
    return (entry.province ? this._maps()?.regionOfProvince.get(entry.province) : null) ?? null;
  }

  /**
   * Reads the resellers and their licenses of the current time mode.
   */
  private _load(): void {
    const period = this.networkTime();
    this.isLoading.set(true);

    this._networkCacheService.refreshResellerNetwork(period, entries => {
      if (period !== this.networkTime()) return;

      this._entries.set(entries);
      this._buildMap();
      this.isLoading.set(false);
    }, () => {
      if (period !== this.networkTime()) return;

      this._entries.set([]);
      this.mapOption = null;
      this.isLoading.set(false);
    });
  }

  /**
   * Finds the area of a reseller at the current detail.
   * @param entry the reseller.
   * @returns the province code or the region name, or null when the reseller has no province or the map does not know it.
   */
  private _areaOf(entry: CoreResponseResellerNetworkEntryDto): string | null {
    const maps = this._maps();
    if (!maps || !entry.province || !maps.provinceNames.has(entry.province)) return null;

    return this.mapLevel() === MapLevel.Province ? entry.province : maps.regionOfProvince.get(entry.province) ?? null;
  }

  /**
   * Names an area of the current detail.
   * @param area the province code or the region name.
   * @returns the name of the province, or the region name itself.
   */
  private _nameOf(area: string): string {
    return this.mapLevel() === MapLevel.Province ? this._maps()?.provinceNames.get(area) ?? area : area;
  }

  /**
   * Builds the map: each area with resellers is colored by the licenses they activated, the others stay grey.
   * Resellers without a province, or with one the map does not know, are only in the table.
   */
  private _buildMap(): void {
    if (!this._maps()) return;

    const isProvince = this.mapLevel() === MapLevel.Province;
    const byArea = new Map<string, AreaCount>();
    for (const entry of this._entries()) {
      const area = this._areaOf(entry);
      if (!area) continue;

      const count = byArea.get(area) ?? { resellers: 0, licenses: 0 };
      count.resellers += 1;
      count.licenses += entry.licensesActivated;
      byArea.set(area, count);
    }

    const maxLicenses = Math.max(1, ...Array.from(byArea.values(), count => count.licenses));
    const selected = this.selectedAreas();
    this.mapOption = {
      tooltip: {
        ...this._chart.tooltip,
        trigger: 'item',
        formatter: (params) => {
          const { name } = params as { name: string };
          const count = byArea.get(name);
          const label = this._nameOf(name);
          return count
            ? `${label}<br/>Rivenditori: ${count.resellers}<br/>Licenze attivate: ${count.licenses}`
            : `${label}<br/>Nessun rivenditore`;
        },
      },
      visualMap: {
        min: 0,
        max: maxLicenses,
        left: 0,
        bottom: 0,
        text: ['Più licenze', 'Meno licenze'],
        textStyle: { color: this._chart.text },
        inRange: { color: [this._chart.palette[0].replace(/[\d.]+\)$/, '0.25)'), this._chart.palette[0]] },
      },
      series: [{
        type: 'map',
        map: isProvince ? ITALY_PROVINCES_MAP : ITALY_REGIONS_MAP,
        nameProperty: isProvince ? 'sigla' : 'name',
        selectedMode: false,
        itemStyle: { areaColor: this._chart.splitLine, borderColor: this._chart.surface, borderWidth: 0.6 },
        emphasis: { label: { show: false }, itemStyle: { areaColor: this._chart.palette[1] } },
        data: [
          ...Array.from(byArea, ([area, count]) => ({ name: area, value: count.licenses }))
            .filter(item => !selected.includes(item.name)),
          ...selected.map(area => ({ name: area, itemStyle: { areaColor: this._chart.palette[2] } })),
        ],
      }],
    };
  }
}
