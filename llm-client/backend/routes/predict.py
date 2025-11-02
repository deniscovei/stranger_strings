from flask import Blueprint, request, jsonify
import pandas as pd
from io import StringIO
import traceback
import sys
import os
import numpy as np

# Add parent directory to path to import config
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import get_model
from utils.preprocessing import json_prediction


predict_bp = Blueprint('predict', __name__)

# Cache for SHAP explainer
_shap_explainer = None

def get_shap_explainer(model, background_data=None):
    """Get or create SHAP explainer for the model"""
    global _shap_explainer
    
    if _shap_explainer is None:
        try:
            import shap
            
            # For tree-based models (LightGBM, XGBoost)
            if hasattr(model, 'predict_proba') and type(model).__name__ in ['LGBMClassifier', 'XGBClassifier']:
                # Use TreeExplainer for tree models (much faster)
                _shap_explainer = shap.TreeExplainer(model)
                print(f"Created SHAP TreeExplainer for {type(model).__name__}")
            else:
                # For other models, use background data if provided
                if background_data is not None:
                    _shap_explainer = shap.KernelExplainer(model.predict_proba, background_data)
                    print(f"Created SHAP KernelExplainer for {type(model).__name__}")
                else:
                    print(f"Warning: Cannot create SHAP explainer without background data for {type(model).__name__}")
                    return None
        except Exception as e:
            print(f"Error creating SHAP explainer: {e}")
            return None
    
    return _shap_explainer

def json_prediction_with_shap(transaction: dict, model) -> dict:
    """
    Make prediction with SHAP explanations integrated.
    Combines json_prediction logic with SHAP feature analysis.
    """
    from utils.preprocessing import preprocess_single_transaction
    
    # Preprocess the transaction
    features = preprocess_single_transaction(transaction)
    
    # Base result structure
    result = {
        'accountNumber': transaction.get("accountNumber"),
        'transactionDateTime': transaction.get("transactionDateTime"),
        'transactionAmount': transaction.get("transactionAmount"),
        'merchantName': transaction.get("merchantName"),
        'transactionType': transaction.get("transactionType"),
    }
    
    # Make prediction (handle Isolation Forest differently)
    if hasattr(model, 'decision_function') and type(model).__name__ == 'IsolationForest':
        # Isolation Forest returns -1 for anomalies, 1 for normal
        prediction_raw = model.predict(features)[0]
        prediction = 1 if prediction_raw == -1 else 0
        
        # Get anomaly score
        anomaly_score = None
        if hasattr(model, 'decision_function'):
            scores = model.decision_function(features)
            anomaly_score = float(scores[0])
        
        result.update({
            'prediction': int(prediction),
            'isFraud': bool(prediction),
            'anomalyScore': anomaly_score,
            'modelType': 'IsolationForest'
        })
        
        # Add SHAP explanations for Isolation Forest
        try:
            feature_names = features.columns.tolist()
            feature_values = features.iloc[0].tolist()
            
            # Get feature contributions (approximation for anomaly detection)
            feature_contributions = []
            for feature_name, value in zip(feature_names, feature_values):
                feature_contributions.append({
                    'feature': feature_name,
                    'value': float(value),
                    'contribution': abs(float(value)),
                    'impact': 'increases_anomaly_score' if prediction == 1 else 'normal_behavior'
                })
            
            # Sort by contribution
            feature_contributions.sort(key=lambda x: x['contribution'], reverse=True)
            
            result['shapExplanation'] = {
                'top_features': feature_contributions[:10],
                'anomaly_score': anomaly_score,
                'explanation_available': True,
                'note': 'Feature contributions for Isolation Forest (anomaly detection)'
            }
            
            print(f"Anomaly detection feature analysis generated with {len(feature_contributions)} features")
        except Exception as e:
            print(f"Error generating feature analysis: {e}")
            result['shapExplanation'] = {
                'explanation_available': False,
                'error': str(e)
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
        
        result.update({
            'prediction': int(prediction),
            'isFraud': bool(prediction),
            'probabilityFraud': probability_fraud,
            'probabilityNonFraud': probability_non_fraud,
            'modelType': type(model).__name__
        })
        
        # Add SHAP explanations
        try:
            explainer = get_shap_explainer(model)
            if explainer is not None:
                import shap
                
                # Save feature names and values BEFORE calculating SHAP
                feature_names = features.columns.tolist()
                feature_values = features.iloc[0].tolist()
                
                # Calculate SHAP values
                shap_values = explainer.shap_values(features)
                
                # For binary classification, get values for fraud class (class 1)
                if isinstance(shap_values, list):
                    shap_values_fraud = shap_values[1][0]  # Class 1 (fraud)
                else:
                    shap_values_fraud = shap_values[0]
                
                # Create list of feature contributions
                feature_contributions = []
                for feature_name, feature_value, shap_value in zip(feature_names, feature_values, shap_values_fraud):
                    feature_contributions.append({
                        'feature': feature_name,
                        'value': float(feature_value),
                        'shap_value': float(shap_value),
                        'impact': 'increases_fraud_risk' if shap_value > 0 else 'decreases_fraud_risk'
                    })
                
                # Sort by absolute SHAP value
                feature_contributions.sort(key=lambda x: abs(x['shap_value']), reverse=True)
                
                # Get SHAP value range
                shap_values_list = [f['shap_value'] for f in feature_contributions]
                min_shap = min(shap_values_list)
                max_shap = max(shap_values_list)
                
                # Add top 10 most important features to result
                result['shapExplanation'] = {
                    'top_features': feature_contributions[:10],
                    'base_value': float(explainer.expected_value[1] if isinstance(explainer.expected_value, (list, np.ndarray)) else explainer.expected_value),
                    'explanation_available': True,
                    'shap_range': {
                        'min': float(min_shap),
                        'max': float(max_shap)
                    }
                }
                
                print(f"SHAP explanation generated with {len(feature_contributions)} features")
                print(f"SHAP value range: [{min_shap:.4f}, {max_shap:.4f}]")
                print(f"Top 3 features: {[(f['feature'], f['shap_value']) for f in feature_contributions[:3]]}")
        except Exception as e:
            print(f"Error generating SHAP explanation: {e}")
            import traceback
            traceback.print_exc()
            result['shapExplanation'] = {
                'explanation_available': False,
                'error': str(e)
            }
    
    return result

@predict_bp.route('/predict', methods=['POST'])
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
        model = get_model()

        # Check if model is loaded
        if model is None:
            return jsonify({
                'error': 'Model not loaded'
            }), 500

        # Get transaction data from request
        transaction = request.get_json()

        print("TRansaction", transaction)

        if not transaction:
            return jsonify({
                'error': 'No transaction data provided'
            }), 400
        
        # Use json_prediction with SHAP enhancements
        result = json_prediction_with_shap(transaction, model)
        

        return jsonify(result), 200

    except Exception as e:
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc(),
            'message': 'Error processing transaction'
        }), 500

@predict_bp.route('/predict_multiple', methods=['POST'])
def predict_multiple():
    """
    Predict if multiple transactions are fraudulent from a CSV file.

    Expected Input:
    - A CSV file uploaded as 'file' in the request.

    Returns:
    {
        "predictions": [
            {
                "input": { ... },
                "prediction": 1/0,
                "is_fraud": true/false,
                ...
            },
            ...
        ]
    }
    """
    try:
        model = get_model()

        # Check if model is loaded
        if model is None:
            return jsonify({
                'error': 'Model not loaded'
            }), 500

        # Check if a file is provided
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if not file.filename.endswith('.csv'):
            return jsonify({'error': 'File must be CSV format'}), 400

        print("Request received at /predict/multiple endpoint")

        # Read CSV file
        try:
            csv_data = StringIO(file.stream.read().decode("UTF-8"))
            df = pd.read_csv(csv_data)
        except Exception as e:
            return jsonify({'error': f"Failed to read CSV file: {e}"}), 400

        # Validate if the DataFrame is empty
        if df.empty:
            return jsonify({'error': 'CSV file is empty'}), 400

        # Convert DataFrame rows to a list of dictionaries
        transactions = df.to_dict(orient='records')
        print(f"Transcations: {transactions}")

        #transactions = df.values.tolist()

        predictions = []

        for transaction in transactions:
            try:
                result = json_prediction(transaction)

                predictions.append(result)
            except Exception as e:
                predictions.append({
                    'input': transaction,
                    'error': str(e),
                    'message': 'Error processing transaction'
                })

        return jsonify({'predictions': predictions}), 200

    except Exception as e:
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc(),
            'message': 'Error processing transactions'
        }), 500
