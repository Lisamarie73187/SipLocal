declare module 'mapbox-gl/dist/mapbox-gl-csp-worker.js?worker' {
  const WorkerFactory: new () => Worker
  export default WorkerFactory
}
