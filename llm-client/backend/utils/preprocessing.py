import numpy as np
import pandas as pd
from typing import Dict, Any
import sys
import os

# Add parent directory to path to import config
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import ALL_MERCHANT_COUNTRY_CODES, ALL_TRANSACTION_TYPES, ALL_MERCHANT_CATEGORY_CODES

def preprocess_single_transaction(transaction: Dict[str, Any]) -> pd.DataFrame:
    """
    Preprocess a single transaction matching EXACT training pipeline.
    Must produce exactly 43 features (excluding isFraud target).
    Returns DataFrame to preserve column names for SHAP explanations.
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
    
    # Convert object columns to numeric (for SHAP compatibility)
    # These should be numeric but might be strings
    numeric_cols = ['accountNumber', 'posEntryMode', 'posConditionCode', 'cardCVV', 'cardLast4Digits']
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)
    
    # Convert any remaining object columns to numeric
    object_cols = df.select_dtypes(include=['object']).columns
    for col in object_cols:
        try:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
        except Exception as e:
            print(f"Warning: Could not convert {col} to numeric: {e}")
    
    print(f"✓ Preprocessed features: {len(df.columns)} columns")
    print(f"  Columns: {list(df.columns)}")
    
    # Return DataFrame to preserve column names for SHAP
    return df
