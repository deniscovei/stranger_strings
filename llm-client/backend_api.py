from flask import Flask, request, jsonify
import pickle
import numpy as np
import pandas as pd
from typing import Dict, Any

app = Flask(__name__)

# Load the LightGBM model at startup
model = None
try:
    with open('lightgbm_model.pkl', 'rb') as f:
        model = pickle.load(f)
    print("✓ Model loaded successfully")
except Exception as e:
    print(f"⚠ Warning: Could not load model - {e}")

# All expected features from the dataset
EXPECTED_FEATURES = [
    'accountNumber', 'customerId', 'creditLimit', 'availableMoney',
    'transactionDateTime', 'transactionAmount', 'merchantName', 'acqCountry',
    'merchantCountryCode', 'posEntryMode', 'posConditionCode', 'merchantCategoryCode',
    'currentExpDate', 'accountOpenDate', 'dateOfLastAddressChange', 'cardCVV',
    'enteredCVV', 'cardLast4Digits', 'transactionType', 'echoBuffer',
    'currentBalance', 'merchantCity', 'merchantState', 'merchantZip',
    'cardPresent', 'posOnPremises', 'recurringAuthInd', 'expirationDateKeyInMatch'
]

def preprocess_transaction(transaction: Dict[str, Any]) -> np.ndarray:
    """
    Preprocess a transaction dictionary into model input format.
    
    Args:
        transaction: Dictionary containing transaction features
        
    Returns:
        Preprocessed feature array ready for model prediction
    """
    # Convert to DataFrame for easier preprocessing
    df = pd.DataFrame([transaction])
    
    # Handle datetime conversions
    datetime_cols = ['transactionDateTime', 'accountOpenDate', 'dateOfLastAddressChange']
    for col in datetime_cols:
        if col in df.columns and df[col].notna().any():
            df[col] = pd.to_datetime(df[col], errors='coerce')
            # Extract useful features from datetime
            if col == 'transactionDateTime':
                df['transaction_hour'] = df[col].dt.hour
                df['transaction_day'] = df[col].dt.day
                df['transaction_month'] = df[col].dt.month
                df['transaction_dayofweek'] = df[col].dt.dayofweek
                df['transaction_year'] = df[col].dt.year
            elif col == 'accountOpenDate':
                df['account_open_year'] = df[col].dt.year
                df['account_open_month'] = df[col].dt.month
            elif col == 'dateOfLastAddressChange':
                df['address_change_year'] = df[col].dt.year
                df['address_change_month'] = df[col].dt.month
            # Drop original datetime columns
            df = df.drop(columns=[col])
    
    # Handle boolean conversions (False/True strings from CSV)
    bool_cols = ['cardPresent', 'expirationDateKeyInMatch']
    for col in bool_cols:
        if col in df.columns:
            if isinstance(df[col].iloc[0], bool):
                df[col] = df[col].astype(int)
            elif isinstance(df[col].iloc[0], str):
                df[col] = df[col].map({'False': 0, 'True': 1, 'false': 0, 'true': 0}).fillna(0).astype(int)
    
    # Handle categorical columns - use hash encoding for consistency
    categorical_cols = [
        'merchantName', 'acqCountry', 'merchantCountryCode', 'posEntryMode',
        'posConditionCode', 'merchantCategoryCode', 'transactionType',
        'merchantCity', 'merchantState', 'posOnPremises', 'recurringAuthInd'
    ]
    
    for col in categorical_cols:
        if col in df.columns:
            # Convert empty strings and NaN to 'UNKNOWN'
            df[col] = df[col].fillna('UNKNOWN').astype(str)
            # Hash encode categorical values
            df[col] = df[col].apply(lambda x: abs(hash(x)) % 100000)
    
    # Handle CVV matching (414 == 414 means match)
    if 'cardCVV' in df.columns and 'enteredCVV' in df.columns:
        df['cvv_match'] = (df['cardCVV'] == df['enteredCVV']).astype(int)
    
    # Handle text/numeric fields
    text_cols = ['cardCVV', 'enteredCVV', 'cardLast4Digits', 'currentExpDate', 'merchantZip', 'echoBuffer']
    for col in text_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
    
    # Ensure all remaining object columns are converted
    for col in df.columns:
        if df[col].dtype == 'object':
            df[col] = df[col].fillna('UNKNOWN').astype(str).apply(lambda x: abs(hash(x)) % 100000)
    
    # Fill any remaining NaN values with 0
    df = df.fillna(0)
    
    # Convert all to float for model compatibility
    df = df.astype(float)
    
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
        
        # Preprocess the transaction
        features = preprocess_transaction(transaction)
        
        # Make prediction
        prediction = model.predict(features)[0]
        
        # Get probability if the model supports it
        fraud_probability = None
        if hasattr(model, 'predict_proba'):
            probabilities = model.predict_proba(features)[0]
            fraud_probability = float(probabilities[1])  # Probability of fraud class
        
        # Prepare response
        result = {
            'prediction': int(prediction),
            'is_fraud': bool(prediction),
            'fraud_probability': fraud_probability,
            'transaction_id': transaction.get('row_id', None)
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'message': 'Error processing transaction'
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
