# Backend API - Modular Structure

## Directory Structure

```
backend/
├── backend_api.py          # Main Flask application entry point
├── config.py               # Model loading and configuration
├── routes/                 # API endpoints (Blueprints)
│   ├── __init__.py
│   ├── health.py          # GET /health - Health check endpoint
│   └── predict.py         # POST /predict - Fraud prediction endpoint
└── utils/                  # Shared utilities
    ├── __init__.py
    └── preprocessing.py   # Transaction preprocessing logic
```

## Overview

The backend has been refactored into a modular structure where each endpoint is in its own file using Flask Blueprints.

### Files Explained

#### `backend_api.py` (Main Entry Point)
- Creates Flask app
- Loads ML model at startup
- Registers all blueprint routes
- Runs the server

#### `config.py` (Configuration & Model Loading)
- Defines merchant country codes, transaction types, and category codes
- Handles model loading from disk
- Provides `get_model()` function for accessing the loaded model

#### `routes/health.py` (Health Endpoint)
- **GET /health** - Returns server health status and model load status
- Blueprint: `health_bp`

#### `routes/predict.py` (Prediction Endpoint)
- **POST /predict** - Predicts fraud for a single transaction
- Blueprint: `predict_bp`
- Handles both standard classifiers (LightGBM, XGBoost) and Isolation Forest

#### `utils/preprocessing.py` (Data Processing)
- `preprocess_single_transaction()` - Converts raw transaction JSON into model features
- Handles one-hot encoding, date calculations, and feature engineering
- Must produce exactly 43 features matching training pipeline

## API Endpoints

### Health Check
```bash
GET /health

Response:
{
  "status": "healthy",
  "model_loaded": true
}
```

### Fraud Prediction
```bash
POST /predict
Content-Type: application/json

{
  "accountNumber": 123456789,
  "customerId": 12345,
  "availableMoney": 4500.00,
  "transactionAmount": 250.00,
  "merchantName": "Amazon",
  "merchantCountryCode": "US",
  "transactionType": "PURCHASE",
  "merchantCategoryCode": "online_retail",
  "cardPresent": true,
  ...
}

Response:
{
  "prediction": 0,
  "is_fraud": false,
  "probability_non_fraud": 0.92,
  "probability_fraud": 0.08,
  "model_type": "LGBMClassifier",
  "transaction_id": null
}
```

## How to Add a New Endpoint

1. **Create new route file**: `backend/routes/your_endpoint.py`
   ```python
   from flask import Blueprint, jsonify
   
   your_endpoint_bp = Blueprint('your_endpoint', __name__)
   
   @your_endpoint_bp.route('/your-path', methods=['GET'])
   def your_function():
       return jsonify({'message': 'Hello'})
   ```

2. **Export in routes/__init__.py**:
   ```python
   from .health import health_bp
   from .predict import predict_bp
   from .your_endpoint import your_endpoint_bp
   
   __all__ = ['health_bp', 'predict_bp', 'your_endpoint_bp']
   ```

3. **Register in backend_api.py**:
   ```python
   from routes import health_bp, predict_bp, your_endpoint_bp
   
   app.register_blueprint(health_bp)
   app.register_blueprint(predict_bp)
   app.register_blueprint(your_endpoint_bp)
   ```

## Running the Backend

```bash
# Option 1: Using Docker Compose (recommended)
docker compose up -d backend-api

# Option 2: Locally (for development)
cd llm-client/backend
python backend_api.py

# Option 3: With Flask CLI
export FLASK_APP=backend/backend_api.py
export FLASK_ENV=development
flask run --host=0.0.0.0 --port=5000
```

## Testing

```bash
# Test health endpoint
curl http://localhost:5000/health

# Test prediction endpoint
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d @test_transaction.json
```

## Benefits of This Structure

✅ **Separation of Concerns**: Each endpoint is isolated in its own file
✅ **Easy to Test**: Can test individual endpoints independently
✅ **Scalable**: Simple to add new endpoints without touching existing code
✅ **Maintainable**: Logic is organized by feature (routes, utils, config)
✅ **Reusable**: Utilities like preprocessing can be imported anywhere
✅ **Clean**: Main app file is now just 12 lines instead of 240+
