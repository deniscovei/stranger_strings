"""
Script to run a trained model on new data
Loads a saved model and makes predictions on the transactions dataset
"""
import os
import sys
import argparse
import pickle
import pandas as pd
import numpy as np
from sklearn.metrics import (
    classification_report, recall_score, precision_score, 
    f1_score, confusion_matrix, accuracy_score
)

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from preprocessing import preprocess_pipeline


def load_model(model_path):
    """
    Load a trained model from a pickle file
    
    Args:
        model_path: Path to the .pkl model file
    
    Returns:
        model: The loaded model
    """
    if not os.path.exists(model_path):
        raise FileNotFoundError(f'Model file not found: {model_path}')
    
    print(f'Loading model from: {model_path}')
    with open(model_path, 'rb') as f:
        model = pickle.load(f)
    
    print(f'✓ Model loaded successfully: {type(model).__name__}\n')
    return model


def predict_with_model(model, X, model_name='Model'):
    """
    Make predictions with the loaded model
    
    Args:
        model: Trained model
        X: Features to predict on
        model_name: Name of the model for display
    
    Returns:
        predictions: Binary predictions
    """
    print(f'Making predictions with {model_name}...')
    
    # Check if it's an Isolation Forest (has different prediction format)
    if hasattr(model, 'decision_function') and type(model).__name__ == 'IsolationForest':
        # Isolation Forest returns -1 for anomalies, 1 for normal
        predictions_raw = model.predict(X)
        predictions = (predictions_raw == -1).astype(int)
        print(f'  Isolation Forest: converted -1/1 predictions to 0/1 format')
    else:
        predictions = model.predict(X)
    
    print(f'✓ Predictions complete!\n')
    return predictions


def evaluate_predictions(y_true, y_pred, model_name='Model'):
    """
    Evaluate model predictions and display metrics
    
    Args:
        y_true: True labels
        y_pred: Predicted labels
        model_name: Name of the model for display
    """
    print('='*60)
    print(f'{model_name.upper()} EVALUATION RESULTS')
    print('='*60 + '\n')
    
    # Calculate metrics
    accuracy = accuracy_score(y_true, y_pred)
    recall = recall_score(y_true, y_pred)
    precision = precision_score(y_true, y_pred)
    f1 = f1_score(y_true, y_pred)
    
    print(f'Overall Metrics:')
    print(f'  Accuracy:  {accuracy:.4f}')
    print(f'  Recall:    {recall:.4f} (sensitivity - fraud detection rate)')
    print(f'  Precision: {precision:.4f} (accuracy of fraud predictions)')
    print(f'  F1-Score:  {f1:.4f} (harmonic mean of precision & recall)')
    
    print('\nConfusion Matrix:')
    cm = confusion_matrix(y_true, y_pred)
    print(cm)
    print(f'\n  True Negatives (TN):  {cm[0][0]:,} - Correctly predicted non-fraud')
    print(f'  False Positives (FP): {cm[0][1]:,} - Non-fraud predicted as fraud')
    print(f'  False Negatives (FN): {cm[1][0]:,} - Fraud predicted as non-fraud')
    print(f'  True Positives (TP):  {cm[1][1]:,} - Correctly predicted fraud')
    
    print('\nClassification Report:')
    print(classification_report(y_true, y_pred, target_names=['Non-Fraud', 'Fraud']))
    
    # Calculate fraud detection rate
    total_fraud = (y_true == 1).sum()
    detected_fraud = ((y_true == 1) & (y_pred == 1)).sum()
    fraud_detection_rate = (detected_fraud / total_fraud * 100) if total_fraud > 0 else 0
    
    print(f'\nFraud Detection Summary:')
    print(f'  Total fraud cases: {total_fraud:,}')
    print(f'  Detected fraud cases: {detected_fraud:,}')
    print(f'  Fraud detection rate: {fraud_detection_rate:.2f}%')
    
    print('\n' + '='*60)


def save_predictions(y_pred, output_path='predictions.csv', include_probabilities=False, 
                     model=None, X=None):
    """
    Save predictions to a CSV file
    
    Args:
        y_pred: Predicted labels
        output_path: Path to save predictions
        include_probabilities: Whether to include prediction probabilities
        model: The model (needed for probabilities)
        X: Features (needed for probabilities)
    """
    predictions_df = pd.DataFrame({
        'prediction': y_pred
    })
    
    # Add probabilities if requested and model supports it
    if include_probabilities and model is not None and X is not None:
        if hasattr(model, 'predict_proba'):
            probabilities = model.predict_proba(X)
            predictions_df['probability_non_fraud'] = probabilities[:, 0]
            predictions_df['probability_fraud'] = probabilities[:, 1]
            print(f'Added prediction probabilities to output')
        elif hasattr(model, 'decision_function'):
            # For models like Isolation Forest that use decision_function
            scores = model.decision_function(X)
            predictions_df['anomaly_score'] = scores
            print(f'Added anomaly scores to output')
    
    predictions_df.to_csv(output_path, index=False)
    print(f'\n✓ Predictions saved to: {output_path}')
    print(f'  Total predictions: {len(predictions_df):,}')


def main(model_path, csv_path='dataset/transactions.csv', save_output=False, 
         output_path='predictions.csv', include_probabilities=False):
    """
    Main function to run a trained model on data
    
    Args:
        model_path: Path to the trained model .pkl file
        csv_path: Path to the CSV data file
        save_output: Whether to save predictions to file
        output_path: Path to save predictions
        include_probabilities: Whether to include prediction probabilities
    """
    print('='*60)
    print('FRAUD DETECTION MODEL INFERENCE')
    print('='*60 + '\n')
    
    # Step 1: Load the trained model
    print('Step 1: Loading trained model...\n')
    model = load_model(model_path)
    model_name = os.path.basename(model_path).replace('.pkl', '').replace('_', ' ').title()
    
    # Step 2: Preprocess the data
    print('Step 2: Preprocessing data...\n')
    X_train, X_test, y_train, y_test, df = preprocess_pipeline(csv_path)
    
    # Use test set for predictions (or you can use full dataset)
    X = X_test
    y_true = y_test
    
    print(f'Data shape for predictions: {X.shape}')
    print(f'Number of samples: {len(X):,}')
    print(f'Number of features: {X.shape[1]}\n')
    
    # Step 3: Make predictions
    print('Step 3: Making predictions...\n')
    y_pred = predict_with_model(model, X, model_name)
    
    # Step 4: Evaluate predictions (if we have true labels)
    print('Step 4: Evaluating predictions...\n')
    evaluate_predictions(y_true, y_pred, model_name)
    
    # Step 5: Save predictions if requested
    if save_output:
        print(f'\nStep 5: Saving predictions...\n')
        save_predictions(y_pred, output_path, include_probabilities, model, X)
    
    print('\n' + '='*60)
    print('✅ INFERENCE COMPLETE')
    print('='*60)
    
    return {
        'model': model,
        'predictions': y_pred,
        'X': X,
        'y_true': y_true,
        'model_name': model_name
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Run a trained fraud detection model on data',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run XGBoost model on default dataset
  python run_model.py --model trained_models/xgboost_model.pkl
  
  # Run LightGBM model and save predictions
  python run_model.py --model trained_models/lightgbm_model.pkl --save
  
  # Run Isolation Forest with probabilities
  python run_model.py --model trained_models/isolation_forest_model.pkl --save --probabilities
  
  # Run on custom dataset
  python run_model.py --model trained_models/xgboost_model.pkl --csv dataset/new_data.csv
        """
    )
    
    parser.add_argument(
        '--model',
        '-m',
        type=str,
        required=True,
        help='Path to the trained model .pkl file (e.g., trained_models/xgboost_model.pkl)'
    )
    
    parser.add_argument(
        '--csv',
        '-c',
        type=str,
        default='dataset/transactions.csv',
        help='Path to the CSV data file (default: dataset/transactions.csv)'
    )
    
    parser.add_argument(
        '--save',
        '-s',
        action='store_true',
        help='Save predictions to a CSV file'
    )
    
    parser.add_argument(
        '--output',
        '-o',
        type=str,
        default='predictions.csv',
        help='Output path for predictions (default: predictions.csv)'
    )
    
    parser.add_argument(
        '--probabilities',
        '-p',
        action='store_true',
        help='Include prediction probabilities in output (if model supports it)'
    )
    
    args = parser.parse_args()
    
    # Validate inputs
    if not os.path.exists(args.model):
        print(f'Error: Model file not found: {args.model}')
        print('\nAvailable models in trained_models/:')
        if os.path.exists('trained_models'):
            models = [f for f in os.listdir('trained_models') if f.endswith('.pkl')]
            if models:
                for model_file in models:
                    print(f'  - {model_file}')
            else:
                print('  (No .pkl files found)')
        else:
            print('  (trained_models/ directory not found)')
        sys.exit(1)
    
    if not os.path.exists(args.csv):
        print(f'Error: CSV file not found: {args.csv}')
        sys.exit(1)
    
    # Run the model
    results = main(
        model_path=args.model,
        csv_path=args.csv,
        save_output=args.save,
        output_path=args.output,
        include_probabilities=args.probabilities
    )
    
    print('\n✅ All done! Model inference completed successfully.')
