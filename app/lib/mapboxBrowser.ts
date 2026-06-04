/**
 * Mapbox GL setup for Vite — override worker with CSP build (default worker breaks in dev).
 */
import mapboxgl from 'mapbox-gl'
import MapboxWorker from 'mapbox-gl/dist/mapbox-gl-csp-worker.js?worker'

import 'mapbox-gl/dist/mapbox-gl.css'

// Vite `?worker` export is a Worker constructor class
mapboxgl.workerClass = MapboxWorker as unknown as typeof mapboxgl.workerClass

export { getMapboxAccessToken, validateMapboxToken } from './mapboxEnv'

/** Streets — full road labels and network detail; warm grade in globals.css */
export const MAPBOX_STYLE = 'mapbox://styles/mapbox/streets-v12'

export { mapboxgl }
