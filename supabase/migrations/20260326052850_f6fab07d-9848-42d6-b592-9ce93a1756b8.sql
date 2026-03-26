
-- Step 1: Rename and archive the old Hoër Landbouskool Marlow record FIRST to free up the name
UPDATE schools
SET name = 'Hoër Landbouskool Marlow (archived-duplicate)', slug = 'hoer-landbouskool-marlow-archived', is_archived = true, archived_at = now(), is_visible = false, status = 'archived', updated_at = now()
WHERE id = '276760cf-52ec-4d3c-a9eb-133fe02a4a51';

-- Step 2: Now copy all school data from what was Hoër Landbouskool Marlow onto Marlow's ID (ff23044c)
UPDATE schools
SET
  name = 'Hoër Landbouskool Marlow',
  slug = 'hoer-landbouskool-marlow',
  status = 'approved',
  is_visible = true,
  is_archived = false,
  archived_at = NULL,
  updated_at = now()
WHERE id = 'ff23044c-ef47-4f74-b54e-dac15d8e1f33';

-- Step 3: Move all references from old ID to the kept ID
UPDATE profiles SET school_id = 'ff23044c-ef47-4f74-b54e-dac15d8e1f33', updated_at = now() WHERE school_id = '276760cf-52ec-4d3c-a9eb-133fe02a4a51';
UPDATE user_school_follows SET school_id = 'ff23044c-ef47-4f74-b54e-dac15d8e1f33' WHERE school_id = '276760cf-52ec-4d3c-a9eb-133fe02a4a51';
UPDATE springboks SET school_id = 'ff23044c-ef47-4f74-b54e-dac15d8e1f33' WHERE school_id = '276760cf-52ec-4d3c-a9eb-133fe02a4a51';
UPDATE fixtures SET school_a_id = 'ff23044c-ef47-4f74-b54e-dac15d8e1f33', updated_at = now() WHERE school_a_id = '276760cf-52ec-4d3c-a9eb-133fe02a4a51';
UPDATE fixtures SET school_b_id = 'ff23044c-ef47-4f74-b54e-dac15d8e1f33', updated_at = now() WHERE school_b_id = '276760cf-52ec-4d3c-a9eb-133fe02a4a51';
UPDATE scrape_sources SET school_id = 'ff23044c-ef47-4f74-b54e-dac15d8e1f33', updated_at = now() WHERE school_id = '276760cf-52ec-4d3c-a9eb-133fe02a4a51';
