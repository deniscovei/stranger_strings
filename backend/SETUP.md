# Setup Instructions for LLM Client

## Prerequisites
- Docker and Docker Compose installed
- Transactions data file available

## Important: Data File Configuration

The system needs a transactions data file to populate the database. **Before running**, ensure you have the transactions file and configure its path.

### Step 1: Locate Your Transactions File

Find where your `transactions` CSV file is located on your machine.

### Step 2: Configure the Path

Create a `.env` file in the `backend` folder (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` and update the `TRANSACTIONS_FILE` variable:

```bash
# Option 1: Relative path from backend folder
TRANSACTIONS_FILE=../dataset/transactions

# Option 2: Absolute path
TRANSACTIONS_FILE=/path/to/your/transactions

# Option 3: Current directory
TRANSACTIONS_FILE=./transactions
```

### Step 3: Verify the File Exists

Before running docker-compose, verify the path is correct:

```bash
# If using relative path:
ls -lh ../dataset/transactions

# If using absolute path:
ls -lh /path/to/your/transactions
```

### Step 4: Start the Services

```bash
# Build the containers
docker compose build

# Start PostgreSQL and check logs
docker compose up -d postgres

# Check if data loaded successfully
docker compose logs postgres | grep -i "transaction\|copy\|error"

# Start backend API
docker compose up -d backend-api

# Run LLM client
docker compose run --rm backend-api
```

## Troubleshooting

### Issue: Transactions not loading

**Symptom**: Database is empty, no transactions in the table

**Solution**:

1. **Check the file path in .env**:
   ```bash
   cat .env | grep TRANSACTIONS_FILE
   ```

2. **Verify the file exists**:
   ```bash
   # Test the path you configured
   ls -lh $(grep TRANSACTIONS_FILE .env | cut -d= -f2)
   ```

3. **Check Docker logs**:
   ```bash
   docker compose logs postgres
   ```
   Look for messages like:
   - ✅ "Successfully loaded transactions data"
   - ❌ "Failed to load transactions data"
   - ❌ "No such file or directory"

4. **Manually verify database**:
   ```bash
   docker compose exec postgres psql -U mcp_readonly -d txdb -c "SELECT COUNT(*) FROM transactions;"
   ```

5. **Restart with fresh database**:
   ```bash
   # Stop all services
   docker compose down
   
   # Remove the database volume
   docker volume rm backend_postgres_data
   
   # Start again
   docker compose up -d postgres
   docker compose logs -f postgres
   ```

### Issue: File permission denied

**Symptom**: Error mounting the file in Docker

**Solution**:
- Ensure the transactions file has read permissions:
  ```bash
  chmod +r /path/to/transactions
  ```

### Issue: Using different data file on each machine

**Solution**:
Each developer should have their own `.env` file (not committed to git) with their local path:

```bash
# Developer 1's .env
TRANSACTIONS_FILE=/home/user1/data/transactions

# Developer 2's .env  
TRANSACTIONS_FILE=/Users/user2/Downloads/transactions

# Server .env
TRANSACTIONS_FILE=/var/data/transactions
```

## Verification Commands

After starting the services, verify everything is working:

```bash
# 1. Check database has data
docker compose exec postgres psql -U mcp_readonly -d txdb -c "SELECT COUNT(*) FROM transactions;"

# 2. Check API is running
curl http://localhost:5000/health

# 3. Check if postgres is healthy
docker compose ps
```

Expected output for database query should show a number > 0 (not 0).
