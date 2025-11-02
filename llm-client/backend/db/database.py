import os
import psycopg2
from psycopg2.extras import execute_batch
import pandas as pd
from typing import List, Dict, Any

class Database:
    def __init__(self):
        print("✓ Database instance created\n")

    def get_connection(self):
        # return psycopg2.connect(**self.conn_params)

        try:
            conn = psycopg2.connect(os.environ.get('DATABASE_URI'))
            cursor = conn.cursor()

            # Get table schema
            cursor.execute("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'transactions'
                ORDER BY ordinal_position;
            """)
            schema_info = cursor.fetchall()
            print(schema_info)
            return conn
        except Exception as e:
            db_context = "Database connection failed. Unable to access transaction data."
            print(f"⚠ Warning: Could not connect to database - {e}\n")

    def get_data(self):
        """Return data to be displayed on frontend"""

        try:
            conn = psycopg2.connect(os.environ.get('DATABASE_URI'))
            cursor = conn.cursor()

            # Get table schema
            cursor.execute("""
                SELECT accountNumber, transactionDateTime, transactionAmount,
                merchantName, transactionType, merchantCategoryCode,
                merchantCountryCode, isFraud
                FROM transactions;
            """)
            rows = cursor.fetchall()
            return rows
        except Exception as e:
            db_context = "Database connection failed. Unable to access transaction data."
            print(f"⚠ Warning: Could not connect to database - {e}\n")


    def insert_transaction(self, transaction: Dict[str, Any]) -> int:
        """Insert a single transaction"""

        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
        INSERT INTO transactions (
            row_id, accountNumber, customerId, creditLimit, availableMoney,
            transactionDateTime, transactionAmount, merchantName, acqCountry,
            merchantCountryCode, posEntryMode, posConditionCode, merchantCategoryCode,
            currentExpDate, accountOpenDate, dateOfLastAddressChange, cardCVV,
            enteredCVV, cardLast4Digits, transactionType, echoBuffer,
            currentBalance, merchantCity, merchantState, merchantZip,
            cardPresent, posOnPremises, recurringAuthInd,
            expirationDateKeyInMatch, isFraud
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        RETURNING row_id
        """, (
            transaction.get('row_id'),
            transaction.get('accountNumber'),
            transaction.get('customerId'),
            transaction.get('creditLimit'),
            transaction.get('availableMoney'),
            transaction.get('transactionDateTime'),
            transaction.get('transactionAmount'),
            transaction.get('merchantName'),
            transaction.get('acqCountry'),
            transaction.get('merchantCountryCode'),
            transaction.get('posEntryMode'),
            transaction.get('posConditionCode'),
            transaction.get('merchantCategoryCode'),
            transaction.get('currentExpDate'),
            transaction.get('accountOpenDate'),
            transaction.get('dateOfLastAddressChange'),
            transaction.get('cardCVV'),
            transaction.get('enteredCVV'),
            transaction.get('cardLast4Digits'),
            transaction.get('transactionType'),
            transaction.get('echoBuffer'),
            transaction.get('currentBalance'),
            transaction.get('merchantCity'),
            transaction.get('merchantState'),
            transaction.get('merchantZip'),
            transaction.get('cardPresent'),
            transaction.get('posOnPremises'),
            transaction.get('recurringAuthInd'),
            transaction.get('expirationDateKeyInMatch'),
            transaction.get('isFraud', False)
        ))
        result = cursor.fetchone()[0]
        conn.commit()
        cursor.close()
        return result

    def bulk_insert_transactions(self, df: pd.DataFrame) -> int:
        """Insert multiple transactions from a DataFrame"""
        # PostgreSQL BIGINT limits
        BIGINT_MIN = -(2**63)
        BIGINT_MAX = 2**63 - 1

        # Columns that should be within BIGINT range
        bigint_columns = ['row_id', 'accountNumber', 'customerId', 'posEntryMode', 'posConditionCode']

        # Filter out rows with out-of-range values
        valid_mask = pd.Series(True, index=df.index)
        for col in bigint_columns:
            if col in df.columns:
                series = pd.to_numeric(df[col], errors='coerce')
                valid_mask &= series.between(BIGINT_MIN, BIGINT_MAX, inclusive="both")

        df_valid = df[valid_mask]

        if len(df_valid) == 0:
            raise ValueError("No valid rows to insert after filtering out-of-range values")

        print(f"Filtered out {len(df) - len(df_valid)} rows with out-of-range BIGINT values")

        # Ensure all required columns exist
        required_columns = [
            'row_id', 'accountNumber', 'customerId', 'creditLimit', 'availableMoney',
            'transactionDateTime', 'transactionAmount', 'merchantName', 'acqCountry',
            'merchantCountryCode', 'posEntryMode', 'posConditionCode', 'merchantCategoryCode',
            'currentExpDate', 'accountOpenDate', 'dateOfLastAddressChange', 'cardCVV',
            'enteredCVV', 'cardLast4Digits', 'transactionType', 'echoBuffer',
            'currentBalance', 'merchantCity', 'merchantState', 'merchantZip',
            'cardPresent', 'posOnPremises', 'recurringAuthInd', 'expirationDateKeyInMatch', 'isFraud'
        ]

        for col in required_columns:
            if col not in df_valid.columns:
                df_valid[col] = None

        conn = self.get_connection()
        cursor = conn.cursor()

        values = df_valid[required_columns].values.tolist()

        execute_batch(cursor, """
        INSERT INTO transactions (
            row_id, accountNumber, customerId, creditLimit, availableMoney,
            transactionDateTime, transactionAmount, merchantName, acqCountry,
            merchantCountryCode, posEntryMode, posConditionCode, merchantCategoryCode,
            currentExpDate, accountOpenDate, dateOfLastAddressChange, cardCVV,
            enteredCVV, cardLast4Digits, transactionType, echoBuffer,
            currentBalance, merchantCity, merchantState, merchantZip,
            cardPresent, posOnPremises, recurringAuthInd,
            expirationDateKeyInMatch, isFraud
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        """, values)

        conn.commit()
        cursor.close()

        return len(df_valid)

    def clear_transactions(self):
        """Clear all transactions"""
        try:
            query = "DELETE FROM transactions"

            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute(query)
            deleted_count = cursor.rowcount
            conn.commit()

            query2 = "SELECT COUNT(*) FROM transactions;"
            cursor.execute(query2)
            result = cursor.fetchone()[0]
            print(f"{result} rows left in the database")
            cursor.close()
            return deleted_count
        except Exception as e:
            print(f"⚠ Warning: Could not clear transactions - {e}\n")
            raise e

# Create singleton instance
db = Database()
