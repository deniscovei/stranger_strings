-- Load data from the CSV file into the transactions table
\copy transactions FROM '/dataset/transactions' WITH (format csv, header, delimiter ',');
