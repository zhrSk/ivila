-- ivila environmental reference layers.
-- Normally created automatically by lib/spatial-distance.ts / import-spatial-osm.ts.
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS ivila_spatial_features (
  id BIGSERIAL PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('coastline', 'forest')),
  source TEXT NOT NULL DEFAULT 'osm-overpass',
  source_id TEXT NOT NULL,
  name TEXT,
  geom geometry(Geometry, 4326) NOT NULL,
  source_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(kind, source, source_id)
);

CREATE INDEX IF NOT EXISTS ivila_spatial_features_kind_idx
  ON ivila_spatial_features(kind);
CREATE INDEX IF NOT EXISTS ivila_spatial_features_geom_gix
  ON ivila_spatial_features USING GIST (geom);
CREATE INDEX IF NOT EXISTS ivila_spatial_features_geog_gix
  ON ivila_spatial_features USING GIST ((geom::geography));
