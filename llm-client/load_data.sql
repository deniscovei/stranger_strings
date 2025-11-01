-- Load data from the CSV file into the transactions table
\copy transactions FROM '/data/transactions' WITH (format csv, header, delimiter ',');
