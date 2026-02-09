-- Fix inconsistent pump status
-- Set status to 'instalada' for any pump that is currently in an active mill_pump record
UPDATE pump
SET status = 'instalada'
WHERE pump_id IN (
    SELECT pump_id 
    FROM mill_pump 
    WHERE removed_date IS NULL
)
AND status != 'instalada';
