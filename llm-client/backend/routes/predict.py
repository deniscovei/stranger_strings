from flask import Blueprint, request, jsonify
import pandas as pd
from io import StringIO
import traceback
import sys
import os

# Add parent directory to path to import config
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import get_model
from utils.preprocessing import json_prediction


predict_bp = Blueprint('predict', __name__)

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

        result = json_prediction(transaction)

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
