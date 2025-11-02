from flask import Blueprint, request, jsonify
import pandas as pd
from db.database import db
from io import StringIO

INT64_MIN, INT64_MAX = -(2**63), 2**63-1

data_bp = Blueprint('data', __name__)

def out_of_range_cols(df, cols):
    bad = {}
    for c in cols:
        s = pd.to_numeric(df[c], errors="coerce")
        oob = s[(s < INT64_MIN) | (s > INT64_MAX)]
        if len(oob):
            bad[c] = oob.index.tolist()[:10]  # first few rows
    return bad

@data_bp.route('/data', methods=['GET'])
def get_data():
    """Get all data from the transactions table"""
    try:
        print("Request received at /data endpoint")  # Add this log
        rows = db.get_data()
        # Ensure the data is returned as a list of dictionaries
        columns = [
            "accountNumber", "transactionDateTime", "transactionAmount",
            "merchantName", "transactionType", "merchantCategoryCode",
            "merchantCountryCode", "isFraud"
        ]
        data = [dict(zip(columns, row)) for row in rows]
        return jsonify(data), 200
    except Exception as e:
        print(f"Error in /data endpoint: {e}")  # Add this log
        return jsonify({'error': str(e)}), 500


@data_bp.route('/upload', methods=['POST'])
def upload_data():
    """Upload CSV file and insert into database"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if not file.filename.endswith('.csv'):
        return jsonify({'error': 'File must be CSV format'}), 400

    try:
        # Read CSV file
        csv_data = StringIO(file.stream.read().decode("UTF-8"))
        df = pd.read_csv(csv_data)

        # Insert data
        rows_inserted = db.bulk_insert_transactions(df)

        if rows_inserted == 0:
            return jsonify({'error': 'No records were inserted'}), 500

        return jsonify({
            'message': f'Successfully uploaded {rows_inserted} records',
            'rows_processed': rows_inserted
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@data_bp.route('/clear', methods=['POST'])
def clear_data():
    """Clear all data from the transactions table"""
    try:
        rows_affected = db.clear_transactions()
        if rows_affected == 0:
            return jsonify({'error': 'Failed to clear all transaction data'}), 500

        return jsonify({'message': f"Successfully cleared all transaction data: {rows_affected}"}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
