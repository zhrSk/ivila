import { copyFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)

const maplibrePackage = require.resolve('maplibre-gl/package.json')
const maplibreDist = path.join(path.dirname(maplibrePackage), 'dist')

// @mapbox/mapbox-gl-rtl-text v0.4 exports src/index.js, which imports ./icu.wasm.
// MapLibre setRTLTextPlugin expects the browser-ready UMD bundle instead.
// The official dist bundle is built with WASM auto-inline, so it has no external icu.wasm dependency.
const rtlEntry = require.resolve('@mapbox/mapbox-gl-rtl-text')
const rtlPackageRoot = path.dirname(path.dirname(rtlEntry))
const rtlBundle = path.join(rtlPackageRoot, 'dist', 'mapbox-gl-rtl-text.js')

const dest = path.join(process.cwd(), 'public', 'maplibre')
mkdirSync(dest, { recursive: true })

for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  copyFileSync(path.join(maplibreDist, file), path.join(dest, file))
}

copyFileSync(rtlBundle, path.join(dest, 'mapbox-gl-rtl-text.js'))

console.log('MapLibre worker + self-contained RTL text bundle copied to public/maplibre')
