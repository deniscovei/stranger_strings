import pickle
import os

# Define EXACT categories from training
ALL_MERCHANT_COUNTRY_CODES = ['CAN', 'MEX', 'PR', 'US']
ALL_TRANSACTION_TYPES = ['ADDRESS_VERIFICATION', 'PURCHASE', 'REVERSAL']
ALL_MERCHANT_CATEGORY_CODES = [
    'airline', 'auto', 'cable/phone', 'entertainment', 'fastfood', 'food',
    'food_delivery', 'fuel', 'furniture', 'gym', 'health', 'hotels',
    'mobileapps', 'online_gifts', 'online_retail', 'online_subscriptions',
    'personal care', 'rideshare', 'subscriptions'
]

# Load the LightGBM model
model = None

def load_model():
    """Load the ML model at startup"""
    global model
    try:
        model_path = os.getenv('MODEL_PATH', '/app/models/lightgbm_model.pkl')
        if not os.path.exists(model_path):
            model_path = '../models/lightgbm_model.pkl'
        
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
        print(f"✓ Model loaded successfully from {model_path}: {type(model).__name__}")
        if hasattr(model, 'n_features_in_'):
            print(f"✓ Model expects {model.n_features_in_} features")
            
        print(f"✓ Using {len(ALL_MERCHANT_COUNTRY_CODES)} merchant country codes: {ALL_MERCHANT_COUNTRY_CODES}")
        print(f"✓ Using {len(ALL_TRANSACTION_TYPES)} transaction types: {ALL_TRANSACTION_TYPES}")
        print(f"✓ Using {len(ALL_MERCHANT_CATEGORY_CODES)} merchant category codes")
        
        return model
    except Exception as e:
        print(f"⚠ Warning: Could not load model - {e}")
        return None

def get_model():
    """Get the loaded model"""
    return model
