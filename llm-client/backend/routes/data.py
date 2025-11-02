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
    """Get paginated data from the transactions table with optional search and filter"""
    try:
        print("Request received at /data endpoint")
        
        # Get pagination parameters from query string
        page = request.args.get('page', 1, type=int)
        page_size = request.args.get('pageSize', 100, type=int)
        search_term = request.args.get('search', '', type=str)
        filter_by = request.args.get('filter', 'all', type=str)  # 'all', 'fraud', 'legitimate'
        
        # Validate parameters
        if page < 1:
            page = 1
        if page_size < 1 or page_size > 1000:  # Max 1000 rows per page
            page_size = 100
        
        # Calculate offset
        offset = (page - 1) * page_size
        
        # Get total count with filters
        total_rows = db.get_filtered_count(search_term, filter_by)
        
        # Get paginated data with filters
        rows = db.get_data_filtered(offset, page_size, search_term, filter_by)
        
        # Ensure the data is returned as a list of dictionaries
        columns = [
            "accountNumber", "transactionDateTime", "transactionAmount",
            "merchantName", "transactionType", "merchantCategoryCode",
            "merchantCountryCode", "isFraud"
        ]
        data = [dict(zip(columns, row)) for row in rows]
        
        # Calculate pagination metadata
        total_pages = (total_rows + page_size - 1) // page_size if total_rows > 0 else 1
        
        return jsonify({
            'data': data,
            'pagination': {
                'page': page,
                'pageSize': page_size,
                'totalRows': total_rows,
                'totalPages': total_pages,
                'hasNext': page < total_pages,
                'hasPrev': page > 1
            }
        }), 200
    except Exception as e:
        print(f"Error in /data endpoint: {e}")
        return jsonify({'error': str(e)}), 500


@data_bp.route('/upload', methods=['POST'])
def upload_data():
    """Upload CSV file and insert into database"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if not file.filename.endswith('.csv'):
        return jsonify({'error': 'File must be CSV format'}), 400

    print("Request received at /upload endpoint")

    try:

        csv_data = StringIO(file.stream.read().decode("UTF-8"))
        df = pd.read_csv(csv_data)

        # Insert data
        try:
            rows_inserted = db.bulk_insert_transactions(df)
            if rows_inserted == 0:
                return jsonify({'error': 'No records were inserted'}), 500
        except Exception as e:
            return jsonify({'error': f"No records were inserted: {e}"}), 500

        return jsonify({
            'message': f'Successfully uploaded {rows_inserted} records',
            'rows_processed': rows_inserted
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@data_bp.route('/clear', methods=['POST'])
def clear_data():
    """Clear all data from the transactions table"""

    print("Request received at /clear endpoint")
    
    try:
        rows_affected = db.clear_transactions()
        if rows_affected == 0:
            return jsonify({'error': 'Failed to clear all transaction data'}), 500

        return jsonify({'message': f"Successfully cleared all transaction data: {rows_affected}"}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
