-- Enable PostGIS extension for geospatial data
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable pg_trgm extension for text search (autocomplete)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Verify extensions are enabled
SELECT extname, extversion FROM pg_extension WHERE extname IN ('postgis', 'pg_trgm');
