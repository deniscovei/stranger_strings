from flask import Flask, request, jsonify
import pickle
import numpy as np
import pandas as pd
from typing import Dict, Any
import sys
import os

app = Flask(__name__)

# Load the LightGBM model at startup
model = None
try:
    with open('lightgbm_model.pkl', 'rb') as f:
        model = pickle.load(f)
    print("✓ Model loaded successfully")
except Exception as e:
    print(f"⚠ Warning: Could not load model - {e}")

# Load reference data for merchant encoding (if available)
merchant_encoding_map = {}

def preprocess_single_transaction(transaction: Dict[str, Any]) -> np.ndarray:
    """
    Preprocess a single transaction following the same pipeline as training.
    Matches the preprocessing.py logic exactly.
    
    Args:
        transaction: Dictionary containing transaction features
        
    Returns:
        Preprocessed feature array ready for model prediction
    """
    # Convert to DataFrame
    df = pd.DataFrame([transaction])
    
    # Step 1: Drop columns that were dropped during training
    columns_to_drop = [
        "enteredCVV", "creditLimit", "acqCountry", "customerId", 
        "echoBuffer", "merchantCity", "merchantState", "merchantZip", 
        "posOnPremises", "recurringAuthInd"
    ]
    for col in columns_to_drop:
        if col in df.columns:
            df = df.drop(columns=[col])
    
    # Step 2: One-hot encoding for categorical columns
    columns_with_nulls = ['merchantCountryCode', 'transactionType']
    columns_without_nulls = ['merchantCategoryCode']
    all_encode_columns = columns_with_nulls + columns_without_nulls
    
    # Handle columns with nulls - create indicator columns
    for col in columns_with_nulls:
        if col in df.columns:
            null_indicator_col = f'no{col}'
            df[null_indicator_col] = df[col].isnull().astype(int)
            df[col] = df[col].fillna('MISSING')
    
    # Perform one-hot encoding
    encoded_dfs = []
    for col in all_encode_columns:
        if col in df.columns:
            one_hot = pd.get_dummies(df[col], prefix=col, drop_first=False)
            
            if col in columns_with_nulls:
                missing_col_name = f'{col}_MISSING'
                if missing_col_name in one_hot.columns:
                    one_hot = one_hot.drop(columns=[missing_col_name])
            
            encoded_dfs.append(one_hot)
            df = df.drop(columns=[col])
    
    if encoded_dfs:
        df = pd.concat([df] + encoded_dfs, axis=1)
    
    # Step 3: Convert date columns to numeric (days difference)
    df['transactionDateTime'] = pd.to_datetime(df['transactionDateTime'], errors='coerce')
    
    date_columns = {
        'currentExpDate': 'daysToCurrentExpDate',
        'accountOpenDate': 'daysSinceAccountOpen',
        'dateOfLastAddressChange': 'daysSinceLastAddressChange'
    }
    
    for original_col, new_col in date_columns.items():
        if original_col in df.columns:
            df[original_col] = pd.to_datetime(df[original_col], errors='coerce')
            df[new_col] = (df['transactionDateTime'] - df[original_col]).dt.days
            
            if new_col == "daysToCurrentExpDate":
                df[new_col] = -df[new_col]
            
            df = df.drop(columns=[original_col])
    
    df = df.drop(columns=['transactionDateTime'], errors='ignore')
    
    # Step 4: Ordinal encode merchantName
    # Use a simple median rank if we don't have the merchant mapping
    if 'merchantName' in df.columns:
        # For single prediction, use hash-based ordinal encoding
        df['merchantName_ordinal'] = df['merchantName'].astype(str).apply(lambda x: abs(hash(x)) % 10000)
        df = df.drop(columns=['merchantName'])
    
    # Fill any remaining NaN values
    df = df.fillna(0)
    
    # Ensure all numeric
    for col in df.columns:
        if df[col].dtype == 'object':
            df[col] = 0
    
    return df.values

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
    app.run(host='0.0.0.0', port=5000, debug=True)
