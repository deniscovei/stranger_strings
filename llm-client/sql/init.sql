-- Ensure user exists first
DO $$
BEGIN
    -- Create user if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'mcp_readonly') THEN
        CREATE USER mcp_readonly WITH PASSWORD 'your_secure_password';
        RAISE NOTICE 'Created user mcp_readonly';
    ELSE
        RAISE NOTICE 'User mcp_readonly already exists';
    END IF;
END $$;

-- Create the transactions table
CREATE TABLE IF NOT EXISTS transactions (
    row_id bigint,
    accountNumber bigint,
    customerId bigint,
    creditLimit numeric(12,2),
    availableMoney numeric(12,2),
    transactionDateTime timestamp,
    transactionAmount numeric(12,2),
    merchantName text,
    acqCountry text,
    merchantCountryCode text,
    posEntryMode bigint,
    posConditionCode bigint,
    merchantCategoryCode text,
    currentExpDate text,
    accountOpenDate date,
    dateOfLastAddressChange date,
    cardCVV text,
    enteredCVV text,
    cardLast4Digits text,
    transactionType text,
    echoBuffer text,
    currentBalance numeric(12,2),
    merchantCity text,
    merchantState text,
    merchantZip text,
    cardPresent boolean,
    posOnPremises text,
    recurringAuthInd text,
    expirationDateKeyInMatch boolean,
    isFraud boolean
);

-- Grant permissions to the user on the table
GRANT ALL PRIVILEGES ON TABLE transactions TO mcp_readonly;
