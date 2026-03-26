
-- Copy the remaining data fields from the archived duplicate to the active record
UPDATE schools
SET
  province = src.province,
  primary_color = src.primary_color,
  secondary_color = src.secondary_color,
  nickname = src.nickname,
  school_type = src.school_type,
  motto = src.motto,
  website = src.website,
  established_year = src.established_year,
  springboks_count = src.springboks_count,
  emblem_url = src.emblem_url,
  jersey_url = src.jersey_url,
  jersey_config = src.jersey_config,
  icon_url = src.icon_url,
  main_rival = src.main_rival,
  trivia_fact = src.trivia_fact,
  alias = src.alias,
  contact_name = src.contact_name,
  contact_email = src.contact_email,
  contact_phone = src.contact_phone,
  request_logo_url = src.request_logo_url,
  note_to_admin = src.note_to_admin,
  submission_metadata = src.submission_metadata,
  updated_at = now()
FROM schools AS src
WHERE schools.id = 'ff23044c-ef47-4f74-b54e-dac15d8e1f33'
  AND src.id = '276760cf-52ec-4d3c-a9eb-133fe02a4a51';
