"""
XGBoost model training and evaluation for fraud detection
"""
import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.metrics import (
    classification_report, recall_score, precision_score, 
    f1_score, confusion_matrix
)


def train_xgboost(X_train, y_train, verbose=True):
    """Train XGBoost model optimized for recall"""
    if verbose:
        print('='*60)
        print('TRAINING XGBOOST (BASELINE)')
        print('='*60 + '\n')
    
    # Calculate scale_pos_weight for class imbalance
    neg_count = (y_train == 0).sum()
    pos_count = (y_train == 1).sum()
    scale_pos_weight = neg_count / pos_count if pos_count > 0 else 1
    
    if verbose:
        print(f'Class imbalance ratio (neg/pos): {scale_pos_weight:.2f}')
        print(f'Using scale_pos_weight={scale_pos_weight:.2f} to boost recall\n')
    
    model = XGBClassifier(
        use_label_encoder=False,
        eval_metric='logloss',  # XGBoost doesn't support f1 directly, use logloss
        # scale_pos_weight=scale_pos_weight,
        max_depth=6,
        learning_rate=0.1,
        n_estimators=200,
        min_child_weight=1,
        subsample=0.8,
        colsample_bytree=0.8,
        gamma=0,
        reg_alpha=0,
        reg_lambda=1,
        random_state=42,
        n_jobs=-1
    )
    
    if verbose:
        print('Training XGBoost model...')
    
    model.fit(X_train, y_train)
    
    if verbose:
        print('Training complete!\n')
    
    return model


def evaluate_xgboost(model, X_train, y_train, X_test, y_test, verbose=True):
    """Evaluate XGBoost model on train and test sets"""
    if verbose:
        print('='*60)
        print('EVALUATING XGBOOST MODEL')
        print('='*60 + '\n')
    
    # Train set predictions
    y_train_pred = model.predict(X_train)
    
    if verbose:
        print('=== TRAIN SET PERFORMANCE ===')
        print(f'Recall (fraud class): {recall_score(y_train, y_train_pred):.4f}')
        print(f'Precision (fraud class): {precision_score(y_train, y_train_pred):.4f}')
        print(f'F1-Score (fraud class): {f1_score(y_train, y_train_pred):.4f}')
        print('\nConfusion Matrix (Train):')
        print(confusion_matrix(y_train, y_train_pred))
    
    # Test set predictions
    y_test_pred = model.predict(X_test)
    
    if verbose:
        print('\n=== TEST SET PERFORMANCE ===')
        print(f'Recall (fraud class): {recall_score(y_test, y_test_pred):.4f}')
        print(f'Precision (fraud class): {precision_score(y_test, y_test_pred):.4f}')
        print(f'F1-Score (fraud class): {f1_score(y_test, y_test_pred):.4f}')
        print('\nConfusion Matrix (Test):')
        print(confusion_matrix(y_test, y_test_pred))
        print('\nClassification Report (Test):')
        print(classification_report(y_test, y_test_pred))
    
    return y_train_pred, y_test_pred


def get_feature_importance(model, X_train, top_n=15, verbose=True):
    """Get and display feature importances"""
    if hasattr(X_train, 'columns'):
        fi = pd.Series(model.feature_importances_, index=X_train.columns)
        
        if verbose:
            print(f'\nTop {top_n} Most Important Features (XGBoost):')
            print(fi.nlargest(top_n))
        
        return fi
    return None


def train_and_evaluate_xgboost(X_train, y_train, X_test, y_test, verbose=True):
    """Complete XGBoost training and evaluation pipeline"""
    model = train_xgboost(X_train, y_train, verbose=verbose)
    y_train_pred, y_test_pred = evaluate_xgboost(
        model, X_train, y_train, X_test, y_test, verbose=verbose
    )
    feature_importance = get_feature_importance(model, X_train, verbose=verbose)
    
    if verbose:
        print('\n' + '='*60)
        print('XGBoost training and evaluation complete!')
        print('='*60)
    
    return model, y_train_pred, y_test_pred, feature_importance
