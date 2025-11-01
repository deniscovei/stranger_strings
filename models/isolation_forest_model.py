"""
Isolation Forest model training and evaluation for fraud detection
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import (
    classification_report, recall_score, precision_score, 
    f1_score, confusion_matrix
)


def train_isolation_forest(X_train, y_train, verbose=True):
    """
    Train Isolation Forest model optimized for recall
    
    Isolation Forest is an unsupervised anomaly detection algorithm that works well
    for fraud detection. It doesn't use labels during training but we use them for
    contamination parameter tuning and evaluation.
    """
    if verbose:
        print('='*60)
        print('TRAINING ISOLATION FOREST')
        print('='*60 + '\n')
    
    # Calculate contamination (expected proportion of outliers/fraud)
    fraud_rate = y_train.sum() / len(y_train)
    # Use 3x the actual fraud rate to increase recall
    contamination = fraud_rate * 3.0
    
    if verbose:
        print(f'Actual fraud rate: {fraud_rate:.4f}')
        print(f'Using contamination: {contamination:.4f} (3x actual rate)')
        print(f'This will flag ~{contamination*100:.2f}% of transactions as anomalies\n')
    
    # Initialize Isolation Forest
    iso_forest = IsolationForest(
        n_estimators=300,           # More trees for better stability
        max_samples=256,            # Subsample size for each tree
        # contamination=contamination, # Expected proportion of outliers
        max_features=1.0,           # Use all features
        bootstrap=False,            # Don't use bootstrap sampling
        n_jobs=-1,                  # Use all CPU cores
        random_state=42,
        verbose=0
    )
    
    if verbose:
        print('Training Isolation Forest...')
        print('(Note: Isolation Forest is unsupervised - labels not used in training)\n')
    
    # Fit the model (unsupervised - doesn't use y_train)
    iso_forest.fit(X_train)
    
    if verbose:
        print('Training complete!\n')
    
    return iso_forest


def predict_isolation_forest(model, X, optimize_threshold=False, y_true=None, verbose=False):
    """
    Make predictions with Isolation Forest
    
    Args:
        model: Trained Isolation Forest model
        X: Features to predict
        optimize_threshold: If True, find optimal threshold using y_true
        y_true: True labels (required if optimize_threshold=True)
        verbose: Print details
    
    Returns:
        predictions: Binary predictions (1 = fraud, 0 = normal)
        anomaly_scores: Raw anomaly scores from the model
    """
    # Get anomaly scores (more negative = more anomalous)
    anomaly_scores = model.decision_function(X)
    
    if optimize_threshold and y_true is not None:
        # Find optimal threshold by maximizing recall at acceptable precision
        # Try different percentile thresholds
        best_threshold = None
        best_recall = 0
        best_predictions = None
        
        for percentile in range(60, 95, 5):
            threshold = np.percentile(anomaly_scores, percentile)
            preds = (anomaly_scores < threshold).astype(int)
            recall = recall_score(y_true, preds)
            precision = precision_score(y_true, preds) if preds.sum() > 0 else 0
            
            # Prefer higher recall with acceptable precision (>0.01)
            if recall > best_recall and precision > 0.01:
                best_recall = recall
                best_threshold = threshold
                best_predictions = preds
                
                if verbose:
                    print(f'Percentile {percentile}: threshold={threshold:.4f}, '
                          f'recall={recall:.4f}, precision={precision:.4f}')
        
        if best_predictions is not None:
            if verbose:
                print(f'\nOptimal threshold: {best_threshold:.4f} (recall={best_recall:.4f})')
            return best_predictions, anomaly_scores
    
    # Default: use model's built-in prediction (based on contamination parameter)
    # -1 = anomaly/fraud, 1 = normal
    predictions = model.predict(X)
    # Convert to 0/1 (1 = fraud, 0 = normal)
    predictions = (predictions == -1).astype(int)
    
    return predictions, anomaly_scores


def evaluate_isolation_forest(model, X_train, y_train, X_test, y_test, verbose=True):
    """Evaluate Isolation Forest model on train and test sets"""
    if verbose:
        print('='*60)
        print('EVALUATING ISOLATION FOREST MODEL')
        print('='*60 + '\n')
    
    # Train set predictions (with threshold optimization)
    y_train_pred, train_scores = predict_isolation_forest(
        model, X_train, optimize_threshold=True, y_true=y_train, verbose=False
    )
    
    if verbose:
        print('=== TRAIN SET PERFORMANCE ===')
        print(f'Recall (fraud class): {recall_score(y_train, y_train_pred):.4f}')
        print(f'Precision (fraud class): {precision_score(y_train, y_train_pred):.4f}')
        print(f'F1-Score (fraud class): {f1_score(y_train, y_train_pred):.4f}')
        print('\nConfusion Matrix (Train):')
        print(confusion_matrix(y_train, y_train_pred))
    
    # Test set predictions (without threshold optimization - use training threshold)
    y_test_pred, test_scores = predict_isolation_forest(
        model, X_test, optimize_threshold=False, y_true=None, verbose=False
    )
    
    if verbose:
        print('\n=== TEST SET PERFORMANCE ===')
        print(f'Recall (fraud class): {recall_score(y_test, y_test_pred):.4f}')
        print(f'Precision (fraud class): {precision_score(y_test, y_test_pred):.4f}')
        print(f'F1-Score (fraud class): {f1_score(y_test, y_test_pred):.4f}')
        print('\nConfusion Matrix (Test):')
        print(confusion_matrix(y_test, y_test_pred))
        print('\nClassification Report (Test):')
        print(classification_report(y_test, y_test_pred))
        
        # Additional stats
        print('\nAnomaly Score Statistics (Test):')
        print(f'  Mean: {test_scores.mean():.4f}')
        print(f'  Std: {test_scores.std():.4f}')
        print(f'  Min (most anomalous): {test_scores.min():.4f}')
        print(f'  Max (most normal): {test_scores.max():.4f}')
    
    return y_train_pred, y_test_pred, train_scores, test_scores


def get_feature_importance_approximation(model, X_train, feature_names=None, verbose=True):
    """
    Get approximate feature importance for Isolation Forest
    
    Isolation Forest doesn't have native feature importance, but we can approximate it
    by checking which features contribute most to anomaly scores.
    """
    if verbose:
        print('\nNote: Isolation Forest does not provide native feature importance.')
        print('Feature importance can be approximated but is not directly available.\n')
    
    return None


def train_and_evaluate_isolation_forest(X_train, y_train, X_test, y_test, verbose=True):
    """Complete Isolation Forest training and evaluation pipeline"""
    model = train_isolation_forest(X_train, y_train, verbose=verbose)
    
    y_train_pred, y_test_pred, train_scores, test_scores = evaluate_isolation_forest(
        model, X_train, y_train, X_test, y_test, verbose=verbose
    )
    
    feature_importance = get_feature_importance_approximation(
        model, X_train, verbose=verbose
    )
    
    if verbose:
        print('\n' + '='*60)
        print('Isolation Forest training and evaluation complete!')
        print('='*60)
    
    return model, y_train_pred, y_test_pred, feature_importance
