-- Phase 2 spatial schema draft for Royan Estate
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE area_kind AS ENUM ('coast', 'forest', 'village', 'urban', 'custom');
CREATE TYPE deal_kind AS ENUM ('sale', 'rent');
CREATE TYPE property_kind AS ENUM ('villa', 'land', 'apartment');

CREATE TABLE geo_areas (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  kind area_kind NOT NULL,
  parent_id BIGINT REFERENCES geo_areas(id),
  boundary geometry(MultiPolygon, 4326) NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX geo_areas_boundary_gix ON geo_areas USING GIST (boundary);
CREATE INDEX geo_areas_kind_idx ON geo_areas(kind);

CREATE TABLE properties (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  property_type property_kind NOT NULL,
  deal_type deal_kind NOT NULL,
  price BIGINT,
  land_area NUMERIC(12,2),
  building_area NUMERIC(12,2),
  bedrooms SMALLINT NOT NULL DEFAULT 0,
  location geometry(Point, 4326) NOT NULL,
  address_public TEXT,
  address_private TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX properties_location_gix ON properties USING GIST (location);
CREATE INDEX properties_search_idx ON properties(property_type, deal_type, is_published);

CREATE TABLE property_areas (
  property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  area_id BIGINT NOT NULL REFERENCES geo_areas(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'contains',
  PRIMARY KEY(property_id, area_id)
);

-- Automatically find public areas containing a property point.
SELECT a.id, a.name, a.kind
FROM geo_areas a
WHERE a.is_public = TRUE
  AND ST_Intersects(a.boundary, ST_SetSRID(ST_MakePoint(51.9607, 36.5665), 4326));

-- Search inside a polygon drawn by a customer.
-- :geojson is a GeoJSON Polygon sent by the UI.
SELECT p.*
FROM properties p
WHERE p.is_published = TRUE
  AND ST_Within(
    p.location,
    ST_SetSRID(ST_GeomFromGeoJSON(:geojson), 4326)
  );

-- Nearby search, e.g. files within 2 km from a point.
SELECT p.*
FROM properties p
WHERE p.is_published = TRUE
  AND ST_DWithin(
    p.location::geography,
    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
    :radius_meters
  );

-- Environmental layers used by ivila-specific filters.
-- In production, coastline should be a LineString/MultiLineString and forest can be Polygon/MultiPolygon.
CREATE TYPE spatial_feature_kind AS ENUM ('coastline', 'forest', 'main_road', 'poi');

CREATE TABLE spatial_features (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  kind spatial_feature_kind NOT NULL,
  geom geometry(Geometry, 4326) NOT NULL,
  source_name TEXT,
  source_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX spatial_features_geom_gix ON spatial_features USING GIST (geom);
CREATE INDEX spatial_features_kind_idx ON spatial_features(kind);

-- Example: filter published properties by distance to the Caspian coastline.
-- :max_sea_distance_m is supplied by the UI (250, 500, 1000, ...).
SELECT p.*
FROM properties p
WHERE p.is_published = TRUE
  AND EXISTS (
    SELECT 1
    FROM spatial_features sf
    WHERE sf.kind = 'coastline'
      AND ST_DWithin(p.location::geography, sf.geom::geography, :max_sea_distance_m)
  );

-- Example: return computed environmental distances for cards / sorting.
SELECT
  p.id,
  MIN(ST_Distance(p.location::geography, coast.geom::geography)) AS sea_distance_m,
  MIN(ST_Distance(p.location::geography, forest.geom::geography)) AS forest_distance_m
FROM properties p
LEFT JOIN spatial_features coast ON coast.kind = 'coastline'
LEFT JOIN spatial_features forest ON forest.kind = 'forest'
WHERE p.is_published = TRUE
GROUP BY p.id;
