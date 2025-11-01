# Fraud Detection System

## Project Structure

```
llm-client/
├── backend/              # Flask REST API
│   └── backend_api.py   # Fraud prediction endpoint
├── models/              # ML models
│   └── lightgbm_model.pkl
├── sql/                 # Database initialization scripts
│   ├── init.sql        # Schema definition
│   └── load_data.sql   # Data loading
├── aws_client.py       # Interactive LLM chat client
├── docker-compose.yml  # Multi-service orchestration
├── Dockerfile          # Container definition
├── requirements.txt    # Python dependencies
├── .env               # Environment configuration
└── .env.example       # Configuration template
```

## Quick Start

### 1. Configure data file path

⚠️ **IMPORTANT**: Before running, configure your transactions data file path:

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and set TRANSACTIONS_FILE to your local path
# Example: TRANSACTIONS_FILE=../dataset/transactions
```

See `SETUP.md` for detailed instructions.

### 2. Build containers
```bash
docker compose build
```

### 3. Start services
```bash
# Start PostgreSQL and Backend API
docker compose up -d postgres backend-api

# Verify data loaded (should show count > 0)
docker compose exec postgres psql -U mcp_readonly -d txdb -c "SELECT COUNT(*) FROM transactions;"

# Run interactive LLM client
docker compose run --rm llm-client
```

### 3. Test the API
```bash
curl http://localhost:5000/health
```

## Services

- **PostgreSQL**: Port 5433 (configurable via `.env`)
- **Backend API**: Port 5000 (configurable via `.env`)
- **LLM Client**: Interactive terminal interface

## Configuration

See `.env.example` for all available environment variables or `ENV_CONFIG.md` for detailed documentation.