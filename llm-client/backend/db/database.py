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
        required_columns = [
            'row_id', 'accountNumber', 'customerId', 'creditLimit', 'availableMoney',
            'transactionDateTime', 'transactionAmount', 'merchantName', 'acqCountry',
            'merchantCountryCode', 'posEntryMode', 'posConditionCode', 'merchantCategoryCode',
            'currentExpDate', 'accountOpenDate', 'dateOfLastAddressChange', 'cardCVV',
            'enteredCVV', 'cardLast4Digits', 'transactionType', 'echoBuffer',
            'currentBalance', 'merchantCity', 'merchantState', 'merchantZip',
            'cardPresent', 'posOnPremises', 'recurringAuthInd', 'expirationDateKeyInMatch', 'isFraud'
        ]

        # Ensure all required columns exist
        for col in required_columns:
            if col not in df.columns:
                df[col] = None

        conn = self.get_connection()
        cursor = conn.cursor()

        values = df[required_columns].values.tolist()

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

        return len(values)

    def clear_transactions(self):
        """Clear all transactions"""
        try:
            query = "DELETE FROM transactions"

            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute(query)
            deleted_count = cursor.rowcount
            conn.commit()
            cursor.close()
            return deleted_count
        except Exception as e:
            print(f"⚠ Warning: Could not clear transactions - {e}\n")
            raise e

# Create singleton instance
db = Database()
