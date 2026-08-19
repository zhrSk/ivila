-- Run this ONCE in Neon SQL Editor before Payload creates the point field.
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verification: should return a PostGIS version string.
SELECT PostGIS_Version();
