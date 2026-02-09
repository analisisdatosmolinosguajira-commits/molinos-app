-- Check Mill Community connection
SELECT * FROM mill_community WHERE mill_id = 1;

-- Check Schema of social situations
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'community_social_situation';

-- Check data in social situations
SELECT * FROM community_social_situation;
