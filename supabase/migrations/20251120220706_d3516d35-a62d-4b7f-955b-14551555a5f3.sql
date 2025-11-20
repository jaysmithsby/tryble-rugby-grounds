-- Add color columns to schools table
ALTER TABLE schools 
ADD COLUMN primary_color text,
ADD COLUMN secondary_color text;