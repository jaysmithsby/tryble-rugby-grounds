
-- Backfill: ensure all tournament fixtures have venue_type = 'tournament'
UPDATE fixtures
SET venue_type = 'tournament'
WHERE tournament_id IS NOT NULL AND (venue_type IS NULL OR venue_type != 'tournament');

-- Drop the venue_legacy column
ALTER TABLE fixtures DROP COLUMN venue_legacy;
