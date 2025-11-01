from flask import Blueprint, request, jsonify
import pandas as pd
import psycopg2
from psycopg2.extras import execute_batch
import os
from io import StringIO

data_bp = Blueprint('data', __name__)

def get_db_connection():
    """Create database connection from environment variables"""
    return psycopg2.connect(
        host=os.getenv('POSTGRES_HOST', 'localhost'),
        database=os.getenv('POSTGRES_DB', 'fraud_detection'),
        user=os.getenv('POSTGRES_USER', 'postgres'),
        password=os.getenv('POSTGRES_PASSWORD', 'postgres')
    )

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

        # Connect to database
        conn = get_db_connection()
        cur = conn.cursor()

        # Create table if not exists
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS transactions (
            transaction_id SERIAL PRIMARY KEY,
            account_number BIGINT,
            transaction_amount DECIMAL,
            transaction_date TIMESTAMP,
            merchant_name VARCHAR(255),
            merchant_country VARCHAR(3),
            transaction_type VARCHAR(50),
            card_present BOOLEAN,
            merchant_category_code VARCHAR(50)
        );
        """
        cur.execute(create_table_sql)

        # Prepare data for insertion
        insert_sql = """
        INSERT INTO transactions (
            account_number, transaction_amount, transaction_date,
            merchant_name, merchant_country, transaction_type,
            card_present, merchant_category_code
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """

        # Convert DataFrame to list of tuples
        values = df[[
            'accountNumber', 'transactionAmount', 'transactionDateTime',
            'merchantName', 'merchantCountryCode', 'transactionType',
            'cardPresent', 'merchantCategoryCode'
        ]].values.tolist()

        # Batch insert
        execute_batch(cur, insert_sql, values)
        conn.commit()

        return jsonify({
            'message': f'Successfully uploaded {len(df)} records',
            'rows_processed': len(df)
        }), 200

    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
        return jsonify({'error': str(e)}), 500

    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

@data_bp.route('/clear', methods=['POST'])
def clear_data():
    """Clear all data from the transactions table"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("TRUNCATE TABLE transactions RESTART IDENTITY")
        conn.commit()

        return jsonify({'message': 'Successfully cleared all transaction data'}), 200

    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
        return jsonify({'error': str(e)}), 500

    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()
