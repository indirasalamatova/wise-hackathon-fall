/** Country shapes for the explore globe: Natural Earth 1:110m, slimmed to code/name/region (public/geo). */

export type Region = 'Africa' | 'Americas' | 'Asia' | 'Europe' | 'Oceania'
export const regions: Region[] = ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania']

export interface CountryFeature {
  type: 'Feature'
  properties: { code: string; name: string; region: Region; subregion: string }
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] }
}

let cache: Promise<CountryFeature[]> | null = null

export function loadCountries(): Promise<CountryFeature[]> {
  cache ??= fetch('/geo/countries-110m.json')
    .then((r) => {
      if (!r.ok) throw new Error(`countries ${r.status}`)
      return r.json() as Promise<{ features: CountryFeature[] }>
    })
    .then((d) => d.features)
    .catch((e) => {
      cache = null
      throw e
    })
  return cache
}

/** Rough visual centre: the mean of the largest ring. Good enough to point the camera. */
export function centreOf(f: CountryFeature): { lat: number; lng: number } {
  const rings = f.geometry.type === 'Polygon' ? [(f.geometry.coordinates as number[][][])[0]] : (f.geometry.coordinates as number[][][][]).map((p) => p[0])
  const ring = rings.reduce((a, b) => (b.length > a.length ? b : a))
  const [lng, lat] = ring.reduce(([x, y], [px, py]) => [x + px / ring.length, y + py / ring.length], [0, 0])
  return { lat, lng }
}

export const regionView: Record<Region, { lat: number; lng: number; altitude: number }> = {
  Africa: { lat: 3, lng: 20, altitude: 1.9 },
  Americas: { lat: 10, lng: -80, altitude: 2.4 },
  Asia: { lat: 32, lng: 90, altitude: 2.1 },
  Europe: { lat: 52, lng: 15, altitude: 1.3 },
  Oceania: { lat: -22, lng: 145, altitude: 1.9 },
}
