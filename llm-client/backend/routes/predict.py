from flask import Blueprint, request, jsonify
import traceback
import sys
import os
import numpy as np

# Add parent directory to path to import config
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import get_model
from utils.preprocessing import preprocess_single_transaction

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
        
        if not transaction:
            return jsonify({
                'error': 'No transaction data provided'
            }), 400
        
        # Preprocess the transaction
        features = preprocess_single_transaction(transaction)
        
        # Make prediction (handle Isolation Forest differently)
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
            
            # Add SHAP explanations for Isolation Forest
            try:
                # For Isolation Forest, we can use feature importance from the model
                # or create a simple feature contribution based on anomaly detection
                feature_names = features.columns.tolist()
                feature_values = features.iloc[0].tolist()
                
                # Get feature contributions (simple approximation for anomaly detection)
                # Features with extreme values contribute more to anomaly detection
                feature_contributions = []
                for i, (feature_name, value) in enumerate(zip(feature_names, feature_values)):
                    # Simple heuristic: features farther from mean contribute more
                    feature_contributions.append({
                        'feature': feature_name,
                        'value': float(value),
                        'contribution': abs(float(value)),  # Simplified contribution
                        'impact': 'increases_anomaly_score' if prediction == 1 else 'normal_behavior'
                    })
                
                # Sort by contribution
                feature_contributions.sort(key=lambda x: x['contribution'], reverse=True)
                
                result['shap_explanation'] = {
                    'top_features': feature_contributions[:10],
                    'anomaly_score': anomaly_score,
                    'explanation_available': True,
                    'note': 'Feature contributions for Isolation Forest (anomaly detection)'
                }
                
                print(f"Anomaly detection feature analysis generated with {len(feature_contributions)} features")
            except Exception as e:
                print(f"Error generating feature analysis: {e}")
                result['shap_explanation'] = {
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
            
            result = {
                'prediction': int(prediction),
                'is_fraud': bool(prediction),
                'probability_non_fraud': probability_non_fraud,
                'probability_fraud': probability_fraud,
                'model_type': type(model).__name__,
                'transaction_id': transaction.get('row_id', None)
            }
            
            # Add SHAP explanations
            try:
                explainer = get_shap_explainer(model)
                if explainer is not None:
                    import shap
                    import pandas as pd
                    
                    # Save feature names and values BEFORE calculating SHAP
                    print(f"DEBUG: features type = {type(features)}")
                    print(f"DEBUG: has columns = {hasattr(features, 'columns')}")
                    
                    if hasattr(features, 'columns'):
                        feature_names = features.columns.tolist()
                        print(f"DEBUG: Got {len(feature_names)} feature names from DataFrame")
                        print(f"DEBUG: First 5 feature names: {feature_names[:5]}")
                    else:
                        feature_names = list(range(len(features[0])))
                        print(f"DEBUG: Using numeric indices as feature names: {len(feature_names)} features")
                    
                    feature_values = features.iloc[0].tolist() if hasattr(features, 'iloc') else features[0].tolist()
                    
                    # Calculate SHAP values
                    shap_values = explainer.shap_values(features)
                    
                    # For binary classification, get values for fraud class (class 1)
                    if isinstance(shap_values, list):
                        shap_values_fraud = shap_values[1][0]  # Class 1 (fraud)
                    else:
                        shap_values_fraud = shap_values[0]
                    
                    # Create list of feature contributions
                    feature_contributions = []
                    for i, (feature_name, feature_value, shap_value) in enumerate(zip(feature_names, feature_values, shap_values_fraud)):
                        feature_contributions.append({
                            'feature': feature_name,
                            'value': float(feature_value),
                            'shap_value': float(shap_value),
                            'impact': 'increases_fraud_risk' if shap_value > 0 else 'decreases_fraud_risk'
                        })
                    
                    # Sort by absolute SHAP value (most important features first)
                    feature_contributions.sort(key=lambda x: abs(x['shap_value']), reverse=True)
                    
                    # Get SHAP value range for logging
                    shap_values_list = [f['shap_value'] for f in feature_contributions]
                    min_shap = min(shap_values_list)
                    max_shap = max(shap_values_list)
                    
                    # Add top 10 most important features to result
                    result['shap_explanation'] = {
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
                result['shap_explanation'] = {
                    'explanation_available': False,
                    'error': str(e)
                }
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc(),
            'message': 'Error processing transaction'
        }), 500
