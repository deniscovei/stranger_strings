"""
Main script for fraud detection pipeline
Orchestrates preprocessing, visualization, and model training
"""
import os
import sys
import argparse
import pickle

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from preprocessing import preprocess_pipeline
from visualization import create_correlation_matrices
from models import (
    train_and_evaluate_xgboost, 
    train_and_evaluate_lightgbm,
    train_and_evaluate_isolation_forest
)
from models.lightgbm_model import train_lightgbm_with_random_search, evaluate_lightgbm

csv_path = "\\\\wsl.localhost\\Ubuntu\\home\\marina\\Hackaton\\stranger_strings\\dataset\\transactions.csv"

print(csv_path)

def main(csv_path=csv_path, run_viz=False, run_random_search=False):
    """
    Main fraud detection pipeline
    
    Args:
        csv_path: Path to the transactions CSV file
        run_viz: Whether to run visualization (can be slow)
        run_random_search: Whether to run RandomizedSearchCV for LightGBM (very slow, 500 fits)
    """
    print('='*60)
    print('FRAUD DETECTION PIPELINE')
    print('='*60 + '\n')
    
    # Step 1: Preprocessing
    print('Step 1: Preprocessing data...\n')
    X_train, X_test, y_train, y_test, df = preprocess_pipeline(csv_path)
    
    # Step 2: Visualization (optional, can be slow)
    if run_viz:
        print('\nStep 2: Creating visualizations...\n')

        create_correlation_matrices(df)

    # # Step 3: Train Isolation Forest (unsupervised baseline)
    # print('\nStep 3: Training Isolation Forest model...\n')
    # iso_model, y_train_pred_iso, y_test_pred_iso, iso_fi = train_and_evaluate_isolation_forest(
    #     X_train, y_train, X_test, y_test, verbose=True
    # )
    
    # Step 4: Train XGBoost
    print('\nStep 4: Training XGBoost model...\n')
    xgb_model, y_train_pred_xgb, y_test_pred_xgb, xgb_fi = train_and_evaluate_xgboost(
        X_train, y_train, X_test, y_test, verbose=True
    )
    
    # Step 5: Train LightGBM
    print('\nStep 5: Training LightGBM model...\n')
    lgb_model, y_train_pred_lgb, y_test_pred_lgb, lgb_fi, comparison = train_and_evaluate_lightgbm(
        X_train, y_train, X_test, y_test, 
        y_train_pred_xgb, y_test_pred_xgb, 
        verbose=True
    )
    
    # Step 6 (Optional): Run RandomizedSearchCV for hyperparameter tuning
    lgb_tuned_model = None
    lgb_search_results = None
    tuned_comparison = None
    
    if run_random_search:
        print('\nStep 6: Running RandomizedSearchCV for LightGBM (this will take a while)...\n')
        
        # Run random search
        lgb_tuned_model, lgb_search_results = train_lightgbm_with_random_search(
            X_train, y_train, 
            n_iter=100, 
            cv=5, 
            verbose=True
        )
        
        # Evaluate the tuned model
        print('\nEvaluating tuned LightGBM model...\n')
        y_train_pred_tuned, y_test_pred_tuned = evaluate_lightgbm(
            lgb_tuned_model, X_train, y_train, X_test, y_test, verbose=True
        )
        
        # Compare tuned model with baseline models
        from sklearn.metrics import recall_score, precision_score
        tuned_comparison = {
            'tuned_lgb_recall': recall_score(y_test, y_test_pred_tuned),
            'tuned_lgb_precision': precision_score(y_test, y_test_pred_tuned),
            'lgb_recall': comparison['lgb_recall'],
            'xgb_recall': comparison['xgb_recall']
        }
        
        print('\n' + '='*60)
        print('TUNED MODEL COMPARISON')
        print('='*60)
        print(f'\nTuned LightGBM Test Recall: {tuned_comparison["tuned_lgb_recall"]:.4f}')
        print(f'Baseline LightGBM Test Recall: {tuned_comparison["lgb_recall"]:.4f}')
        print(f'XGBoost Test Recall: {tuned_comparison["xgb_recall"]:.4f}')
        
        recall_improvement = ((tuned_comparison["tuned_lgb_recall"] - tuned_comparison["lgb_recall"]) 
                             / tuned_comparison["lgb_recall"] * 100)
        print(f'\nTuned vs Baseline LightGBM: {recall_improvement:+.2f}% recall change')
    
    # Comprehensive Model Comparison
    from sklearn.metrics import recall_score, precision_score, f1_score
    
    print('\n' + '='*60)
    print('COMPREHENSIVE MODEL COMPARISON - ALL 3 MODELS')
    print('='*60)
    
    # # Calculate metrics for all models
    # iso_metrics = {
    #     'recall': recall_score(y_test, y_test_pred_iso),
    #     'precision': precision_score(y_test, y_test_pred_iso),
    #     'f1': f1_score(y_test, y_test_pred_iso)
    # }
    
    xgb_metrics = {
        'recall': recall_score(y_test, y_test_pred_xgb),
        'precision': precision_score(y_test, y_test_pred_xgb),
        'f1': f1_score(y_test, y_test_pred_xgb)
    }
    
    lgb_metrics = {
        'recall': recall_score(y_test, y_test_pred_lgb),
        'precision': precision_score(y_test, y_test_pred_lgb),
        'f1': f1_score(y_test, y_test_pred_lgb)
    }
    
    # print('\n--- Isolation Forest (Unsupervised Baseline) ---')
    # print(f'  Test Recall:    {iso_metrics["recall"]:.4f}')
    # print(f'  Test Precision: {iso_metrics["precision"]:.4f}')
    # print(f'  Test F1-Score:  {iso_metrics["f1"]:.4f}')
    
    print('\n--- XGBoost (Supervised Baseline) ---')
    print(f'  Test Recall:    {xgb_metrics["recall"]:.4f}')
    print(f'  Test Precision: {xgb_metrics["precision"]:.4f}')
    print(f'  Test F1-Score:  {xgb_metrics["f1"]:.4f}')
    
    print('\n--- LightGBM (Advanced Model) ---')
    print(f'  Test Recall:    {lgb_metrics["recall"]:.4f}')
    print(f'  Test Precision: {lgb_metrics["precision"]:.4f}')
    print(f'  Test F1-Score:  {lgb_metrics["f1"]:.4f}')
    
    if run_random_search:
        print('\n--- LightGBM Tuned (RandomizedSearchCV) ---')
        print(f'  Test Recall:    {tuned_comparison["tuned_lgb_recall"]:.4f}')
        print(f'  Test Precision: {tuned_comparison["tuned_lgb_precision"]:.4f}')
    
    # Determine best model
    print('\n' + '-'*60)
    print('RANKING BY RECALL (Primary Metric for Fraud Detection):')
    print('-'*60)
    
    models_ranking = [
        # ('Isolation Forest', iso_metrics['recall']),
        ('XGBoost', xgb_metrics['recall']),
        ('LightGBM', lgb_metrics['recall'])
    ]
    
    if run_random_search:
        models_ranking.append(('LightGBM Tuned', tuned_comparison['tuned_lgb_recall']))
    
    models_ranking.sort(key=lambda x: x[1], reverse=True)
    
    for rank, (model_name, recall) in enumerate(models_ranking, 1):
        medal = '🥇' if rank == 1 else '🥈' if rank == 2 else '🥉' if rank == 3 else '  '
        print(f'{medal} {rank}. {model_name:20s} - Recall: {recall:.4f}')
    
    print('\n' + '-'*60)
    print('RANKING BY F1-SCORE (Balance of Precision & Recall):')
    print('-'*60)
    
    f1_ranking = [
        # ('Isolation Forest', iso_metrics['f1']),
        ('XGBoost', xgb_metrics['f1']),
        ('LightGBM', lgb_metrics['f1'])
    ]
    
    if run_random_search:
        tuned_f1 = 2 * (tuned_comparison['tuned_lgb_precision'] * tuned_comparison['tuned_lgb_recall']) / \
                   (tuned_comparison['tuned_lgb_precision'] + tuned_comparison['tuned_lgb_recall'])
        f1_ranking.append(('LightGBM Tuned', tuned_f1))
    
    f1_ranking.sort(key=lambda x: x[1], reverse=True)
    
    for rank, (model_name, f1) in enumerate(f1_ranking, 1):
        medal = '🥇' if rank == 1 else '🥈' if rank == 2 else '🥉' if rank == 3 else '  '
        print(f'{medal} {rank}. {model_name:20s} - F1-Score: {f1:.4f}')
    
    print('\n' + '='*60)
    print(f'✅ BEST MODEL FOR FRAUD DETECTION: {models_ranking[0][0].upper()}')
    print(f'   (Highest Recall: {models_ranking[0][1]:.4f})')
    print('='*60)
    
    print('\n' + '='*60)
    print('SAVING MODELS TO DISK')
    print('='*60)
    
    # Create trained_models directory if it doesn't exist
    models_dir = 'trained_models'
    os.makedirs(models_dir, exist_ok=True)
    
    # # Save Isolation Forest model
    # iso_path = os.path.join(models_dir, 'isolation_forest_model.pkl')
    # with open(iso_path, 'wb') as f:
    #     pickle.dump(iso_model, f)
    # print(f'\n✓ Saved Isolation Forest model to: {iso_path}')
    
    # Save XGBoost model
    xgb_path = os.path.join(models_dir, 'xgboost_model.pkl')
    with open(xgb_path, 'wb') as f:
        pickle.dump(xgb_model, f)
    print(f'✓ Saved XGBoost model to: {xgb_path}')
    
    # Save LightGBM model
    lgb_path = os.path.join(models_dir, 'lightgbm_model.pkl')
    with open(lgb_path, 'wb') as f:
        pickle.dump(lgb_model, f)
    print(f'✓ Saved LightGBM model to: {lgb_path}')
    
    # Save tuned LightGBM model if it exists
    if run_random_search and lgb_tuned_model is not None:
        lgb_tuned_path = os.path.join(models_dir, 'lightgbm_tuned_model.pkl')
        with open(lgb_tuned_path, 'wb') as f:
            pickle.dump(lgb_tuned_model, f)
        print(f'✓ Saved Tuned LightGBM model to: {lgb_tuned_path}')
    
    print(f'\nAll models saved to: {os.path.abspath(models_dir)}/')
    print('='*60)
    
    # Summary (legacy - kept for backwards compatibility)
    print('\n' + '='*60)
    print('PIPELINE COMPLETE - LEGACY SUMMARY')
    print('='*60)
    # print(f'\nIsolation Forest Test Recall: {iso_metrics["recall"]:.4f}')
    # print(f'Isolation Forest Test Precision: {iso_metrics["precision"]:.4f}')
    print(f'\nXGBoost Test Recall: {comparison["xgb_recall"]:.4f}')
    print(f'XGBoost Test Precision: {comparison["xgb_precision"]:.4f}')
    print(f'\nLightGBM Test Recall: {comparison["lgb_recall"]:.4f}')
    print(f'LightGBM Test Precision: {comparison["lgb_precision"]:.4f}')
    
    print('\n' + '='*60)
    
    results = {
        # 'iso_model': iso_model,
        'xgb_model': xgb_model,
        'lgb_model': lgb_model,
        'X_train': X_train,
        'X_test': X_test,
        'y_train': y_train,
        'y_test': y_test,
        'comparison': comparison,
        # 'iso_metrics': iso_metrics,
        'xgb_metrics': xgb_metrics,
        'lgb_metrics': lgb_metrics,
        'models_ranking': models_ranking,
        'f1_ranking': f1_ranking
    }
    
    if run_random_search:
        results['lgb_tuned_model'] = lgb_tuned_model
        results['lgb_search_results'] = lgb_search_results
        results['tuned_comparison'] = tuned_comparison
    
    return results


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Fraud Detection Pipeline')
    parser.add_argument(
        '--csv', 
        type=str, 
        default='dataset/resampled_data.csv',
        help='Path to transactions CSV file'
    )
    parser.add_argument(
        '--viz', 
        action='store_true',
        help='Run visualization steps (can be slow)'
    )
    parser.add_argument(
        '--random-search',
        action='store_true',
        help='Run RandomizedSearchCV for LightGBM hyperparameter tuning (very slow, 500 fits with parallelization)'
    )
    
    args = parser.parse_args()
    
    if not os.path.exists(args.csv):
        print(f'Error: File not found: {args.csv}')
        print('Please make sure the CSV file exists or provide the correct path with --csv')
        sys.exit(1)
    
    results = main(csv_path=args.csv, run_viz=args.viz, run_random_search=args.random_search)
    
    print('\n✅ All done! Models are ready for predictions.')
