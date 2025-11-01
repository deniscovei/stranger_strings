from flask import Flask, request, jsonify
import pickle
import numpy as np
import pandas as pd
from typing import Dict, Any
import os

app = Flask(__name__)

# Load the LightGBM model at startup
model = None

# Define EXACT categories from training (based on feature list provided)
ALL_MERCHANT_COUNTRY_CODES = ['CAN', 'MEX', 'PR', 'US']
ALL_TRANSACTION_TYPES = ['ADDRESS_VERIFICATION', 'PURCHASE', 'REVERSAL']
ALL_MERCHANT_CATEGORY_CODES = [
    'airline', 'auto', 'cable/phone', 'entertainment', 'fastfood', 'food',
    'food_delivery', 'fuel', 'furniture', 'gym', 'health', 'hotels',
    'mobileapps', 'online_gifts', 'online_retail', 'online_subscriptions',
    'personal care', 'rideshare', 'subscriptions'
]

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


def preprocess_single_transaction(transaction: Dict[str, Any]) -> np.ndarray:
    """
    Preprocess a single transaction matching EXACT training pipeline.
    Must produce exactly 43 features (excluding isFraud target).
    """
    # Convert to DataFrame
    df = pd.DataFrame([transaction])
    
    # Step 1: Drop unnecessary columns
    columns_to_drop = [
        "Unnamed: 0", "enteredCVV", "creditLimit", 
        "acqCountry", "customerId", "echoBuffer", 
        "merchantCity", "merchantState", "merchantZip", 
        "posOnPremises", "recurringAuthInd"
    ]
    for col in columns_to_drop:
        if col in df.columns:
            df = df.drop(columns=[col])
    
    # Step 2: One-hot encoding for categorical variables
    # Handle merchantCountryCode
    if 'merchantCountryCode' in df.columns:
        df['nomerchantCountryCode'] = df['merchantCountryCode'].isnull().astype(int)
        value = str(df['merchantCountryCode'].iloc[0]) if pd.notna(df['merchantCountryCode'].iloc[0]) else None
        
        for code in ALL_MERCHANT_COUNTRY_CODES:
            col_name = f'merchantCountryCode_{code}'
            df[col_name] = (value == code)
        
        df = df.drop(columns=['merchantCountryCode'])
    
    # Handle transactionType
    if 'transactionType' in df.columns:
        df['notransactionType'] = df['transactionType'].isnull().astype(int)
        value = str(df['transactionType'].iloc[0]) if pd.notna(df['transactionType'].iloc[0]) else None
        
        for ttype in ALL_TRANSACTION_TYPES:
            col_name = f'transactionType_{ttype}'
            df[col_name] = (value == ttype)
        
        df = df.drop(columns=['transactionType'])
    
    # Handle merchantCategoryCode
    if 'merchantCategoryCode' in df.columns:
        value = str(df['merchantCategoryCode'].iloc[0]) if pd.notna(df['merchantCategoryCode'].iloc[0]) else None
        
        for cat in ALL_MERCHANT_CATEGORY_CODES:
            col_name = f'merchantCategoryCode_{cat}'
            df[col_name] = (value == cat)
        
        df = df.drop(columns=['merchantCategoryCode'])
    
    # Step 3: Convert dates to numeric (days calculations)
    df['transactionDateTime'] = pd.to_datetime(df['transactionDateTime'], errors='coerce')
    
    # currentExpDate -> daysToCurrentExpDate (negative of difference)
    if 'currentExpDate' in df.columns:
        df['currentExpDate'] = pd.to_datetime(df['currentExpDate'], errors='coerce')
        df['daysToCurrentExpDate'] = -(df['transactionDateTime'] - df['currentExpDate']).dt.days
        df = df.drop(columns=['currentExpDate'])
    
    # accountOpenDate -> daysSinceAccountOpen
    if 'accountOpenDate' in df.columns:
        df['accountOpenDate'] = pd.to_datetime(df['accountOpenDate'], errors='coerce')
        df['daysSinceAccountOpen'] = (df['transactionDateTime'] - df['accountOpenDate']).dt.days
        df = df.drop(columns=['accountOpenDate'])
    
    # dateOfLastAddressChange -> daysSinceLastAddressChange
    if 'dateOfLastAddressChange' in df.columns:
        df['dateOfLastAddressChange'] = pd.to_datetime(df['dateOfLastAddressChange'], errors='coerce')
        df['daysSinceLastAddressChange'] = (df['transactionDateTime'] - df['dateOfLastAddressChange']).dt.days
        df = df.drop(columns=['dateOfLastAddressChange'])
    
    df = df.drop(columns=['transactionDateTime'], errors='ignore')
    
    # Step 4: Ordinal encode merchantName (use simple hash for single transaction)
    if 'merchantName' in df.columns:
        df['merchantName_ordinal'] = df['merchantName'].astype(str).apply(lambda x: abs(hash(x)) % 10000)
        df = df.drop(columns=['merchantName'])
    
    # Remove isFraud if present (target variable)
    if 'isFraud' in df.columns:
        df = df.drop(columns=['isFraud'])
    
    # Convert boolean columns to int
    bool_cols = df.select_dtypes(include=['bool']).columns
    for col in bool_cols:
        df[col] = df[col].astype(int)
    
    # Fill any remaining NaN values
    df = df.fillna(0)
    
    print(f"✓ Preprocessed features: {len(df.columns)} columns")
    print(f"  Columns: {list(df.columns)}")
    
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
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_ENV', 'production') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)
