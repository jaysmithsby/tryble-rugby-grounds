
CREATE OR REPLACE FUNCTION public.update_edition_dates_from_fixtures()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_edition_id uuid;
  v_min_date timestamptz;
  v_max_date timestamptz;
BEGIN
  -- Determine which edition(s) to update
  -- On DELETE, use OLD; on INSERT, use NEW; on UPDATE, handle both old and new tournament_id
  
  IF TG_OP = 'DELETE' THEN
    v_edition_id := OLD.tournament_id;
  ELSIF TG_OP = 'INSERT' THEN
    v_edition_id := NEW.tournament_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If tournament_id changed, update the old edition first
    IF OLD.tournament_id IS DISTINCT FROM NEW.tournament_id AND OLD.tournament_id IS NOT NULL THEN
      SELECT MIN(match_date), MAX(match_date)
      INTO v_min_date, v_max_date
      FROM fixtures
      WHERE tournament_id = OLD.tournament_id;

      IF v_min_date IS NOT NULL THEN
        UPDATE tournament_editions
        SET start_date = v_min_date, end_date = v_max_date, updated_at = now()
        WHERE id = OLD.tournament_id;
      ELSE
        UPDATE tournament_editions
        SET start_date = created_at, end_date = created_at, updated_at = now()
        WHERE id = OLD.tournament_id;
      END IF;
    END IF;
    v_edition_id := NEW.tournament_id;
  END IF;

  -- Update the current/new edition
  IF v_edition_id IS NOT NULL THEN
    SELECT MIN(match_date), MAX(match_date)
    INTO v_min_date, v_max_date
    FROM fixtures
    WHERE tournament_id = v_edition_id;

    IF v_min_date IS NOT NULL THEN
      UPDATE tournament_editions
      SET start_date = v_min_date, end_date = v_max_date, updated_at = now()
      WHERE id = v_edition_id;
    ELSE
      UPDATE tournament_editions
      SET start_date = created_at, end_date = created_at, updated_at = now()
      WHERE id = v_edition_id;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_edition_dates
AFTER INSERT OR UPDATE OF tournament_id, match_date OR DELETE ON fixtures
FOR EACH ROW EXECUTE FUNCTION update_edition_dates_from_fixtures();
