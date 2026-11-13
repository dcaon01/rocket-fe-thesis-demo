import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

/** Name the map of the Italian provinces is registered with in ECharts. */
export const ITALY_PROVINCES_MAP = 'italy-provinces';

/** Name the map of the Italian regions is registered with in ECharts. */
export const ITALY_REGIONS_MAP = 'italy-regions';

/** URL of the simplified GeoJSON of the Italian provinces (ISTAT boundaries via openpolis, CC BY). */
const ITALY_PROVINCES_URL = '/geo/italy-provinces.json';

/** URL of the GeoJSON of the Italian regions, the provinces dissolved by region. */
const ITALY_REGIONS_URL = '/geo/italy-regions.json';

/** GeoJSON of the provinces: each feature carries its code (`sigla`), its name and its region. */
interface ProvincesGeoJson {
  type: 'FeatureCollection';
  features: { properties: { sigla: string; name: string; region: string } }[];
}

/** GeoJSON of the regions: each feature carries its name. */
interface RegionsGeoJson {
  type: 'FeatureCollection';
  features: { properties: { name: string } }[];
}

/** What the registered maps tell about their areas. */
export interface ItalyMaps {
  /** Name of each province, by code. */
  provinceNames: Map<string, string>;
  /** Name of the region of each province, by code. */
  regionOfProvince: Map<string, string>;
  /** Names of the regions. */
  regionNames: Set<string>;
}

/**
 * Service that loads the maps of the Italian provinces and regions once and registers them in ECharts, for the
 * network map of the global dashboard.
 */
@Injectable({
  providedIn: 'root'
})
export class GeoMapService {
  /** HTTP client instance. */
  private readonly _http = inject(HttpClient);

  /** Registration in flight or done, with what the maps tell about their areas. */
  private _maps: Promise<ItalyMaps> | null = null;

  /**
   * Registers the maps of the Italian provinces and regions in ECharts, downloading them the first time only.
   * @returns a promise resolving to the names of the provinces and regions, and the region of each province.
   */
  registerItalyMaps(): Promise<ItalyMaps> {
    this._maps ??= Promise.all([
      import('echarts'),
      firstValueFrom(this._http.get<ProvincesGeoJson>(ITALY_PROVINCES_URL)),
      firstValueFrom(this._http.get<RegionsGeoJson>(ITALY_REGIONS_URL)),
    ])
      .then(([echarts, provinces, regions]) => {
        echarts.registerMap(ITALY_PROVINCES_MAP, provinces as unknown as Parameters<typeof echarts.registerMap>[1]);
        echarts.registerMap(ITALY_REGIONS_MAP, regions as unknown as Parameters<typeof echarts.registerMap>[1]);
        return {
          provinceNames: new Map(provinces.features.map(feature => [feature.properties.sigla, feature.properties.name])),
          regionOfProvince: new Map(provinces.features.map(feature => [feature.properties.sigla, feature.properties.region])),
          regionNames: new Set(regions.features.map(feature => feature.properties.name)),
        };
      })
      .catch((error: unknown) => {
        this._maps = null;
        throw error;
      });

    return this._maps;
  }
}
