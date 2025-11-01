# Test Claudiu Chat Endpoint

## Test cu curl

### 1. Chat simplu (fără SQL):
```bash
curl -X POST http://localhost:5000/chat/simple \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is fraud detection?"
  }'
```

### 2. Chat cu interogări SQL automate:
```bash
curl -X POST http://localhost:5000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How many transactions are there in total?"
  }'
```

### 3. Exemple de întrebări pentru chat:
```bash
# Număr de tranzacții
curl -X POST http://localhost:5000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How many transactions are in the database?"
  }'

# Tranzacții frauduloase
curl -X POST http://localhost:5000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How many fraudulent transactions are there?"
  }'

# Top merchants
curl -X POST http://localhost:5000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the top 5 merchants by transaction count?"
  }'

# Suma medie
curl -X POST http://localhost:5000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the average transaction amount?"
  }'
```

### 4. Execută SQL direct:
```bash
curl -X POST http://localhost:5000/execute-sql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT COUNT(*) as total FROM transactions;"
  }'
```

### 5. Conversație multi-turn:
```bash
curl -X POST http://localhost:5000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Show me the first 5 transactions",
    "conversation_history": []
  }'
```

## Test cu Python

```python
import requests
import json

# Test chat endpoint
def test_chat(message):
    url = "http://localhost:5000/chat"
    payload = {"message": message}
    
    response = requests.post(url, json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response:\n{json.dumps(response.json(), indent=2)}\n")
    return response.json()

# Test simple chat
def test_simple_chat(message):
    url = "http://localhost:5000/chat/simple"
    payload = {"message": message}
    
    response = requests.post(url, json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response:\n{json.dumps(response.json(), indent=2)}\n")
    return response.json()

# Test SQL execution
def test_sql(query):
    url = "http://localhost:5000/execute-sql"
    payload = {"query": query}
    
    response = requests.post(url, json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response:\n{json.dumps(response.json(), indent=2)}\n")
    return response.json()

# Run tests
if __name__ == "__main__":
    print("=== Test 1: Simple Chat ===")
    test_simple_chat("What is fraud detection?")
    
    print("\n=== Test 2: Chat with SQL ===")
    test_chat("How many transactions are there?")
    
    print("\n=== Test 3: Direct SQL ===")
    test_sql("SELECT COUNT(*) as total FROM transactions;")
    
    print("\n=== Test 4: Complex query ===")
    test_chat("What percentage of transactions are fraudulent?")
```

## Răspunsuri așteptate

### Pentru `/chat/simple`:
```json
{
  "response": "Fraud detection is the process of identifying and preventing fraudulent activities..."
}
```

### Pentru `/chat`:
```json
{
  "response": "Let me check that for you. ```sql\nSELECT COUNT(*) FROM transactions;\n```",
  "sql_query": "SELECT COUNT(*) FROM transactions;",
  "sql_executed": true,
  "query_results": {
    "columns": ["count"],
    "rows": [[1000000]],
    "success": true
  },
  "final_response": "There are 1,000,000 transactions in the database.",
  "conversation": [...]
}
```

### Pentru `/execute-sql`:
```json
{
  "columns": ["count"],
  "rows": [[1000000]],
  "success": true
}
```

## Pornire backend

```bash
# Cu Docker Compose
cd llm-client
docker compose up -d backend-api

# Verifică logs
docker compose logs -f backend-api

# Sau local (pentru development)
cd llm-client/backend
python backend_api.py
```

## Endpoints disponibile

- **POST /chat** - Chat interactiv cu execuție automată SQL
- **POST /chat/simple** - Chat simplu fără SQL
- **POST /execute-sql** - Execută direct o interogare SQL
- **GET /health** - Health check
- **POST /predict** - Predicție fraud pentru tranzacție

## Note importante

1. **AWS_BEARER_TOKEN_BEDROCK** trebuie să fie setat în `.env`
2. **DATABASE_URI** trebuie să pointeze la PostgreSQL cu tranzacții
3. Claude va genera automat interogări SQL când întrebi despre date
4. Doar interogări **SELECT** sunt permise (securitate)
5. Rezultatele sunt limitate la primele 50 de rânduri pentru eficiență
