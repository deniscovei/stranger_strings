from flask import Flask, request, jsonify
import pickle
import numpy as np
import pandas as pd
from typing import Dict, Any
from inference.preprocessing import preprocess_single_transaction
import os

from constants import (
    ALL_MERCHANT_COUNTRY_CODES,
    ALL_TRANSACTION_TYPES,
    ALL_MERCHANT_CATEGORY_CODES
)

app = Flask(__name__)

# Load the LightGBM model at startup
model = None

# # Define EXACT categories from training (based on feature list provided)
# ALL_MERCHANT_COUNTRY_CODES = ['CAN', 'MEX', 'PR', 'US']
# ALL_TRANSACTION_TYPES = ['ADDRESS_VERIFICATION', 'PURCHASE', 'REVERSAL']
# ALL_MERCHANT_CATEGORY_CODES = [
#     'airline', 'auto', 'cable/phone', 'entertainment', 'fastfood', 'food',
#     'food_delivery', 'fuel', 'furniture', 'gym', 'health', 'hotels',
#     'mobileapps', 'online_gifts', 'online_retail', 'online_subscriptions',
#     'personal care', 'rideshare', 'subscriptions'
# ]

try:
    # Model path - check multiple locations
    model_path = os.getenv('MODEL_PATH', '/app/models/lightgbm_model.pkl')
    if not os.path.exists(model_path):
        model_path = '../models/lightgbm_model.pkl'  # Fallback for local development

    with open(model_path, 'rb') as f:
        model = pickle.load(f)
    print(f"✓ Model loaded successfully from {model_path}: {type(model).__name__}")
    if hasattr(model, 'n_features_in_'):
        print(f"✓ Model expects {model.n_features_in_} features")

    print(f"✓ Using {len(ALL_MERCHANT_COUNTRY_CODES)} merchant country codes: {ALL_MERCHANT_COUNTRY_CODES}")
    print(f"✓ Using {len(ALL_TRANSACTION_TYPES)} transaction types: {ALL_TRANSACTION_TYPES}")
    print(f"✓ Using {len(ALL_MERCHANT_CATEGORY_CODES)} merchant category codes")

except Exception as e:
    print(f"⚠ Warning: Could not load model - {e}")


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None
    })

@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict if a transaction is fraudulent.
    Follows the exact same prediction logic as run_model.py

    Expected JSON body:
    {
        "accountNumber": 123456789,
        "customerId": 12345,
        "creditLimit": 5000.00,
        "availableMoney": 4500.00,
        "transactionAmount": 250.00,
        "merchantName": "Amazon",
        "currentBalance": 500.00,
        "cardPresent": true,
        ...
    }

    Returns:
    {
        "is_fraud": true/false,
        "fraud_probability": 0.85,
        "prediction": 1/0
    }
    """
    try:
        # Check if model is loaded
        if model is None:
            return jsonify({
                'error': 'Model not loaded'
            }), 500

        # Get transaction data from request
        transaction = request.get_json()

        if not transaction:
            return jsonify({
                'error': 'No transaction data provided'
            }), 400

        # Preprocess the transaction (same as run_model.py preprocessing)
        features = preprocess_single_transaction(transaction)

        # Make prediction (handle Isolation Forest differently like run_model.py)
        if hasattr(model, 'decision_function') and type(model).__name__ == 'IsolationForest':
            # Isolation Forest returns -1 for anomalies, 1 for normal
            prediction_raw = model.predict(features)[0]
            prediction = 1 if prediction_raw == -1 else 0  # Convert -1 -> 1 (fraud), 1 -> 0 (normal)

            # Get anomaly score
            anomaly_score = None
            if hasattr(model, 'decision_function'):
                scores = model.decision_function(features)
                anomaly_score = float(scores[0])

            result = {
                'prediction': int(prediction),
                'is_fraud': bool(prediction),
                'anomaly_score': anomaly_score,
                'model_type': 'IsolationForest',
                'transaction_id': transaction.get('row_id', None)
            }
        else:
            # Standard classification model (LightGBM, XGBoost, etc.)
            prediction = model.predict(features)[0]

            # Get probability if the model supports it
            probability_non_fraud = None
            probability_fraud = None

            if hasattr(model, 'predict_proba'):
                probabilities = model.predict_proba(features)[0]
                probability_non_fraud = float(probabilities[0])
                probability_fraud = float(probabilities[1])

            result = {
                'prediction': int(prediction),
                'is_fraud': bool(prediction),
                'probability_non_fraud': probability_non_fraud,
                'probability_fraud': probability_fraud,
                'model_type': type(model).__name__,
                'transaction_id': transaction.get('row_id', None)
            }

        return jsonify(result), 200

    except Exception as e:
        import traceback
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc(),
            'message': 'Error processing transaction'
        }), 500

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_ENV', 'production') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)
