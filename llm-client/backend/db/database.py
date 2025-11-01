import os
import psycopg2
from psycopg2.extras import execute_batch
import pandas as pd
from typing import List, Dict, Any

class Database:
    def __init__(self):
        self.conn_params = {
            'host': os.getenv('POSTGRES_HOST', 'localhost'),
            'database': os.getenv('POSTGRES_DB', 'fraud_detection'),
            'user': os.getenv('POSTGRES_USER', 'postgres'),
            'password': os.getenv('POSTGRES_PASSWORD', 'postgres')
        }

    def get_connection(self):
        return psycopg2.connect(**self.conn_params)

    def init_db(self):
        """Initialize database tables"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                CREATE TABLE IF NOT EXISTS transactions (
                    transaction_id SERIAL PRIMARY KEY,
                    account_number BIGINT,
                    customer_id BIGINT,
                    transaction_amount DECIMAL,
                    transaction_date TIMESTAMP,
                    merchant_name VARCHAR(255),
                    merchant_country VARCHAR(3),
                    merchant_category_code VARCHAR(50),
                    transaction_type VARCHAR(50),
                    card_present BOOLEAN,
                    cvv_provided BOOLEAN,
                    is_fraud BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                """)

    def insert_transaction(self, transaction: Dict[str, Any]) -> int:
        """Insert a single transaction and return its ID"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                INSERT INTO transactions (
                    account_number, customer_id, transaction_amount,
                    transaction_date, merchant_name, merchant_country,
                    merchant_category_code, transaction_type, card_present,
                    cvv_provided, is_fraud
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING transaction_id
                """, (
                    transaction.get('accountNumber'),
                    transaction.get('customerId'),
                    transaction.get('transactionAmount'),
                    transaction.get('transactionDateTime'),
                    transaction.get('merchantName'),
                    transaction.get('merchantCountryCode'),
                    transaction.get('merchantCategoryCode'),
                    transaction.get('transactionType'),
                    transaction.get('cardPresent'),
                    transaction.get('enteredCVV'),
                    transaction.get('isFraud', False)
                ))
                return cur.fetchone()[0]

    def bulk_insert_transactions(self, df: pd.DataFrame) -> int:
        """Insert multiple transactions from a DataFrame"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                values = df[[
                    'accountNumber', 'customerId', 'transactionAmount',
                    'transactionDateTime', 'merchantName', 'merchantCountryCode',
                    'merchantCategoryCode', 'transactionType', 'cardPresent',
                    'enteredCVV'
                ]].values.tolist()

                execute_batch(cur, """
                INSERT INTO transactions (
                    account_number, customer_id, transaction_amount,
                    transaction_date, merchant_name, merchant_country,
                    merchant_category_code, transaction_type, card_present,
                    cvv_provided
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, values)

                return len(values)

    def clear_transactions(self):
        """Clear all transactions"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("TRUNCATE TABLE transactions RESTART IDENTITY")

# Create singleton instance
db = Database()
