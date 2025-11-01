-- This script always runs on startup to ensure data is loaded
-- It truncates and reloads the transactions table

\echo 'Starting data load process...'

-- First, check if table exists and has data
DO $$
DECLARE
    row_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO row_count FROM transactions;
    RAISE NOTICE 'Current transaction count: %', row_count;
    
    IF row_count > 0 THEN
        RAISE NOTICE 'Table already has data. Skipping reload to preserve existing data.';
        RAISE NOTICE 'If you want to reload data, manually truncate the table first.';
    ELSE
        RAISE NOTICE 'Table is empty. Loading data...';
        
        -- Load data from CSV
        COPY transactions FROM '/dataset/transactions' WITH (format csv, header, delimiter ',');
        
        -- Get the count after loading
        SELECT COUNT(*) INTO row_count FROM transactions;
        RAISE NOTICE 'Successfully loaded % transactions', row_count;
    END IF;
END $$;

\echo 'Data load process completed!'
