-- Grant comprehensive permissions to the user (user was already created in init.sql)
GRANT ALL PRIVILEGES ON DATABASE txdb TO mcp_readonly;
GRANT ALL PRIVILEGES ON SCHEMA public TO mcp_readonly;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mcp_readonly;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mcp_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mcp_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mcp_readonly;

-- Load data from the CSV file into the transactions table
-- Check if file exists and load data
DO $$
BEGIN
    -- Try to load data, catch errors if file doesn't exist
    BEGIN
        COPY transactions FROM '/dataset/transactions' WITH (format csv, header, delimiter ',');
        RAISE NOTICE 'Successfully loaded transactions data';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to load transactions data: %', SQLERRM;
    END;
END $$;
