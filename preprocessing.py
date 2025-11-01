"""
Preprocessing utilities for fraud detection
"""
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split


def load_data(csv_path='dataset/transactions.csv'):
    """Load and perform initial data cleaning"""
    df = pd.read_csv(csv_path)
    print('Loaded dataset with shape:', df.shape)
    
    if csv_path == 'dataset/resampled_data.csv':
        df['isFraud'] = df['target']
        df.drop(["enteredCVV", "creditLimit", "noacqCountry", 
                 "acqCountry_CAN", "acqCountry_MEX", "acqCountry_PR",
                 "acqCountry_US", "target"], 
                 axis=1, inplace=True)
        return df

    # Drop all null columns
    columns_to_drop = [
        "Unnamed: 0", "enteredCVV", "creditLimit", 
        "acqCountry","customerId", "echoBuffer", 
        "merchantCity", "merchantState", "merchantZip", 
        "posOnPremises", "recurringAuthInd"
    ]
    df = df.drop(columns_to_drop, axis=1)
    
    return df


def one_hot_encode_categorical(df):
    """Apply one-hot encoding to categorical columns"""
    print('Starting one-hot encoding...\n')
    
    columns_with_nulls = ['acqCountry', 'merchantCountryCode', 'transactionType']
    columns_without_nulls = ['merchantCategoryCode']
    all_encode_columns = columns_with_nulls + columns_without_nulls
    
    # Handle columns with nulls - create indicator columns
    for col in columns_with_nulls:
        if col in df.columns:
            null_indicator_col = f'no{col}'
            df[null_indicator_col] = df[col].isnull().astype(int)
            df[col] = df[col].fillna('MISSING')
    
    # Perform one-hot encoding
    encoded_dfs = []
    for col in all_encode_columns:
        if col in df.columns:
            one_hot = pd.get_dummies(df[col], prefix=col, drop_first=False)
            
            if col in columns_with_nulls:
                missing_col_name = f'{col}_MISSING'
                if missing_col_name in one_hot.columns:
                    one_hot = one_hot.drop(columns=[missing_col_name])
            
            encoded_dfs.append(one_hot)
            df = df.drop(columns=[col])
    
    if encoded_dfs:
        df = pd.concat([df] + encoded_dfs, axis=1)
    
    print(f'Encoding complete! New shape: {df.shape}\n')
    return df


def convert_dates_to_numeric(df):
    """Convert date columns to days difference"""
    print('Converting date columns to numeric features...\n')
    
    date_columns = {
        'currentExpDate': 'daysToCurrentExpDate',
        'accountOpenDate': 'daysSinceAccountOpen',
        'dateOfLastAddressChange': 'daysSinceLastAddressChange'
    }
    
    df['transactionDateTime'] = pd.to_datetime(df['transactionDateTime'], errors='coerce')
    
    for original_col, new_col in date_columns.items():
        if original_col in df.columns:
            df[original_col] = pd.to_datetime(df[original_col], errors='coerce')
            df[new_col] = (df['transactionDateTime'] - df[original_col]).dt.days
            
            if new_col == "daysToCurrentExpDate":
                df[new_col] = -df[new_col]
            
            df = df.drop(columns=[original_col])
    
    df.drop(['transactionDateTime'], axis=1, inplace=True)
    print('Date conversion complete!\n')
    return df


def ordinal_encode_merchant(df):
    """Apply ordinal encoding to merchantName based on fraud probability"""
    print('Applying ordinal encoding to merchantName...\n')
    
    if 'merchantName' not in df.columns:
        print('merchantName column not found - skipping')
        return df
    
    merchant_stats = df.groupby('merchantName').agg({
        'isFraud': ['sum', 'count']
    }).reset_index()
    
    merchant_stats.columns = ['merchantName', 'fraud_count', 'total_count']
    merchant_stats['prob_fraud'] = merchant_stats['fraud_count'] / merchant_stats['total_count']
    merchant_stats['score'] = merchant_stats['prob_fraud']
    merchant_stats = merchant_stats.sort_values('score', ascending=True).reset_index(drop=True)
    merchant_stats['ordinal_rank'] = range(len(merchant_stats))
    
    merchant_to_rank = dict(zip(merchant_stats['merchantName'], merchant_stats['ordinal_rank']))
    df['merchantName_ordinal'] = df['merchantName'].map(merchant_to_rank)
    
    unmapped_count = df['merchantName_ordinal'].isnull().sum()
    if unmapped_count > 0:
        median_rank = merchant_stats['ordinal_rank'].median()
        df['merchantName_ordinal'].fillna(median_rank, inplace=True)
    
    df = df.drop(columns=['merchantName'])
    print(f'Ordinal encoding complete! Total merchants: {len(merchant_stats)}\n')
    return df


def prepare_train_test_split(df, test_size=0.2, random_state=42):
    """Prepare X, y and create stratified train/test split"""
    if 'isFraud' not in df.columns:
        raise KeyError("Column 'isFraud' not found in dataframe")
    
    y = df['isFraud']
    X = df.drop(columns=['isFraud'])
    
    print(f'X shape: {X.shape}')
    print(f'y shape: {y.shape}')
    print(f'Fraud rate: {y.mean():.4f}\n')
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, stratify=y, random_state=random_state
    )
    
    print(f'Train shapes -> X: {X_train.shape}, y: {y_train.shape}')
    print(f'Test shapes  -> X: {X_test.shape}, y: {y_test.shape}')
    print(f'Train fraud rate: {y_train.mean():.4f}')
    print(f'Test fraud rate: {y_test.mean():.4f}\n')
    
    return X_train, X_test, y_train, y_test


def preprocess_pipeline(csv_path='dataset/transactions.csv'):
    """Full preprocessing pipeline"""
    print('='*60)
    print('STARTING PREPROCESSING PIPELINE')
    print('='*60 + '\n')
    
    # Load data
    df = load_data(csv_path)

    if csv_path != 'dataset/resampled_data.csv':
        # One-hot encoding
        df = one_hot_encode_categorical(df)
        
        # Date conversion
        df = convert_dates_to_numeric(df)
        
        # Merchant encoding
        df = ordinal_encode_merchant(df)
    
    # Train/test split
    X_train, X_test, y_train, y_test = prepare_train_test_split(df)
    
    print('='*60)
    print('PREPROCESSING COMPLETE')
    print('='*60 + '\n')
    
    return X_train, X_test, y_train, y_test, df
