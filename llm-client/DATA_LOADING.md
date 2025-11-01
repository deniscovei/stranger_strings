# Data Loading Configuration

## How It Works

The system now includes an **automatic data loader** that runs every time you start the services:

1. **postgres** service starts and creates the database schema
2. **data-loader** service waits for postgres to be healthy
3. **data-loader** checks if transactions table has data:
   - If empty: loads data from CSV file
   - If has data: skips loading to preserve existing data
4. **backend-api** starts only after data-loader completes successfully

## Configuration

### Default Behavior (Preserve Data)

```bash
# Normal startup - data is loaded only if table is empty
docker compose up -d postgres backend-api
```

### Force Reload Data

To force a complete reload (truncate and reload):

```bash
# Method 1: Set environment variable
FORCE_RELOAD=true docker compose up -d postgres backend-api

# Method 2: Add to .env file
echo "FORCE_RELOAD=true" >> .env
docker compose up -d postgres backend-api

# Don't forget to remove it after reload!
```

### Change Data File

Edit the `.env` file:

```bash
# Point to a different transactions file
TRANSACTIONS_FILE=/path/to/your/transactions.csv
```

Or set it inline:

```bash
TRANSACTIONS_FILE=/path/to/data.csv docker compose up -d
```

## Benefits

✅ **Always runs**: Data loading happens on every startup, not just first time
✅ **Preserves data**: Won't reload if data already exists (unless forced)
✅ **Dependency management**: Backend API waits for data loading to complete
✅ **Clear logging**: See exactly what happened in data-loader logs
✅ **No manual intervention**: Works automatically with `docker compose up`

## Troubleshooting

### Check if data loaded:

```bash
docker logs stranger_strings_data_loader
```

### Check transaction count:

```bash
docker exec stranger_strings_postgres psql -U mcp_readonly -d txdb -c "SELECT COUNT(*) FROM transactions;"
```

### Manually reload data:

```bash
# Truncate the table
docker exec stranger_strings_postgres psql -U mcp_readonly -d txdb -c "TRUNCATE transactions;"

# Restart data loader to reload
docker compose restart data-loader
```

### View data loader status:

```bash
docker compose ps data-loader
```

Expected status: `Exited (0)` - means it completed successfully
