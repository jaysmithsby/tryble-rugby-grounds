ALTER TABLE predictions DROP CONSTRAINT predictions_predicted_margin_check;
ALTER TABLE predictions ADD CONSTRAINT predictions_predicted_margin_check CHECK (predicted_margin >= 0);