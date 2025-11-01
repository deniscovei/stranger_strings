"""
LightGBM model training and evaluation for fraud detection
"""
import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.model_selection import RandomizedSearchCV
from sklearn.metrics import (
    classification_report, recall_score, precision_score, 
    f1_score, confusion_matrix, make_scorer
)


def train_lightgbm(X_train, y_train, verbose=True):
    """Train LightGBM model optimized for recall"""
    if verbose:
        print('='*60)
        print('TRAINING LIGHTGBM - OPTIMIZED FOR RECALL')
        print('='*60 + '\n')
    
    # Calculate scale_pos_weight for class imbalance
    neg_count = (y_train == 0).sum()
    pos_count = (y_train == 1).sum()
    scale_pos_weight_lgb = neg_count / pos_count if pos_count > 0 else 1
    
    if verbose:
        print(f'Class imbalance ratio (neg/pos): {scale_pos_weight_lgb:.2f}')
        print(f'Using scale_pos_weight={scale_pos_weight_lgb:.2f} to boost recall\n')
    
    lgb_model = lgb.LGBMClassifier(
        objective='binary',
        metric='binary_logloss',
        boosting_type='gbdt',
        n_estimators=400,
        learning_rate=0.1,
        max_depth=12,
        subsample=0.8,
        subsample_freq=1,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=0.1,
        # scale_pos_weight=scale_pos_weight_lgb,
        random_state=42,
        n_jobs=-1,
        verbose=-1
    )
    
    if verbose:
        print('Training LightGBM model...')
    
    lgb_model.fit(X_train, y_train)
    
    if verbose:
        print('Training complete!\n')
    
    return lgb_model


def evaluate_lightgbm(model, X_train, y_train, X_test, y_test, verbose=True):
    """Evaluate LightGBM model on train and test sets"""
    if verbose:
        print('='*60)
        print('EVALUATING LIGHTGBM MODEL')
        print('='*60 + '\n')
    
    # Train set predictions
    y_train_pred_lgb = model.predict(X_train)
    
    if verbose:
        print('=== TRAIN SET PERFORMANCE ===')
        print(f'Recall (fraud class): {recall_score(y_train, y_train_pred_lgb):.4f}')
        print(f'Precision (fraud class): {precision_score(y_train, y_train_pred_lgb):.4f}')
        print(f'F1-Score (fraud class): {f1_score(y_train, y_train_pred_lgb):.4f}')
        print('\nConfusion Matrix (Train):')
        print(confusion_matrix(y_train, y_train_pred_lgb))
    
    # Test set predictions
    y_test_pred_lgb = model.predict(X_test)
    
    if verbose:
        print('\n=== TEST SET PERFORMANCE ===')
        print(f'Recall (fraud class): {recall_score(y_test, y_test_pred_lgb):.4f}')
        print(f'Precision (fraud class): {precision_score(y_test, y_test_pred_lgb):.4f}')
        print(f'F1-Score (fraud class): {f1_score(y_test, y_test_pred_lgb):.4f}')
        print('\nConfusion Matrix (Test):')
        print(confusion_matrix(y_test, y_test_pred_lgb))
        print('\nClassification Report (Test):')
        print(classification_report(y_test, y_test_pred_lgb))
    
    return y_train_pred_lgb, y_test_pred_lgb


def get_feature_importance(model, X_train, top_n=15, verbose=True):
    """Get and display feature importances"""
    if hasattr(X_train, 'columns'):
        fi_lgb = pd.Series(model.feature_importances_, index=X_train.columns)
        
        if verbose:
            print(f'\nTop {top_n} Most Important Features (LightGBM):')
            print(fi_lgb.nlargest(top_n))
        
        return fi_lgb
    return None


def train_lightgbm_with_random_search(X_train, y_train, n_iter=100, cv=5, verbose=True):
    """
    Train LightGBM with RandomizedSearchCV for hyperparameter tuning
    
    Args:
        X_train: Training features
        y_train: Training labels
        n_iter: Number of parameter settings sampled (default: 100)
        cv: Number of cross-validation folds (default: 5)
        verbose: Whether to print progress
    
    Returns:
        best_model: The best estimator found by RandomizedSearchCV
        search_results: The RandomizedSearchCV object with all results
    """
    if verbose:
        print('='*60)
        print('LIGHTGBM RANDOMIZED SEARCH CV')
        print('='*60 + '\n')
        print(f'Configuration:')
        print(f'  n_iter: {n_iter} (parameter combinations)')
        print(f'  cv: {cv} (cross-validation folds)')
        print(f'  Total fits: {n_iter * cv}\n')
    
    # Calculate scale_pos_weight for class imbalance
    neg_count = (y_train == 0).sum()
    pos_count = (y_train == 1).sum()
    scale_pos_weight_lgb = neg_count / pos_count if pos_count > 0 else 1
    
    if verbose:
        print(f'Class imbalance ratio: {scale_pos_weight_lgb:.2f}\n')
    
    # Define parameter distributions for random search
    param_distributions = {
        'n_estimators': [100, 150, 200, 250, 300, 350, 400],
        'learning_rate': [0.01, 0.03, 0.05, 0.07, 0.1, 0.15],
        'max_depth': [6, 8, 10, 12, 15, -1],
        'num_leaves': [31, 50, 63, 80, 100, 127],
        'min_child_samples': [10, 15, 20, 25, 30, 40, 50],
        'min_child_weight': [0.001, 0.01, 0.1, 1],
        'subsample': [0.6, 0.7, 0.8, 0.9, 1.0],
        'subsample_freq': [0, 1, 2, 3],
        'colsample_bytree': [0.6, 0.7, 0.8, 0.9, 1.0],
        'reg_alpha': [0, 0.01, 0.05, 0.1, 0.5, 1.0],
        'reg_lambda': [0, 0.01, 0.05, 0.1, 0.5, 1.0],
    }
    
    # Base model
    base_model = lgb.LGBMClassifier(
        objective='binary',
        metric='binary_logloss',
        boosting_type='gbdt',
        scale_pos_weight=scale_pos_weight_lgb,
        random_state=42,
        n_jobs=1,  # Set to 1 for each estimator since RandomizedSearchCV parallelizes
        verbose=-1
    )
    
    # Custom scorer for F1 (balancing precision and recall)
    f1_scorer = make_scorer(f1_score)
    
    # RandomizedSearchCV with parallelization
    random_search = RandomizedSearchCV(
        estimator=base_model,
        param_distributions=param_distributions,
        n_iter=n_iter,
        cv=cv,
        scoring=f1_scorer,
        n_jobs=-1,  # Parallelize across all CPUs
        verbose=2 if verbose else 0,
        random_state=42,
        return_train_score=True
    )
    
    if verbose:
        print('Starting RandomizedSearchCV...')
        print('This may take a while with parallelization across all CPUs...\n')
    
    # Fit the random search
    random_search.fit(X_train, y_train)
    
    if verbose:
        print('\n' + '='*60)
        print('RANDOM SEARCH COMPLETE')
        print('='*60 + '\n')
        print(f'Best score (CV F1): {random_search.best_score_:.4f}')
        print(f'\nBest parameters:')
        for param, value in random_search.best_params_.items():
            print(f'  {param}: {value}')
        
        # Show top 5 parameter combinations
        results_df = pd.DataFrame(random_search.cv_results_)
        results_df = results_df.sort_values('rank_test_score')
        
        print(f'\nTop 5 parameter combinations:')
        for idx, row in results_df.head(5).iterrows():
            print(f'\n  Rank {int(row["rank_test_score"])}:')
            print(f'    Mean CV F1: {row["mean_test_score"]:.4f} (+/- {row["std_test_score"]:.4f})')
            print(f'    Mean Fit Time: {row["mean_fit_time"]:.2f}s')
    
    best_model = random_search.best_estimator_
    
    if verbose:
        print('\n' + '='*60)
        print('Best model ready for predictions!')
        print('='*60 + '\n')
    
    return best_model, random_search


def compare_with_xgboost(y_test, y_test_pred_lgb, y_test_pred_xgb, verbose=True):
    """Compare LightGBM with XGBoost baseline"""
    if verbose:
        print('\n' + '='*60)
        print('COMPARISON: LIGHTGBM VS XGBOOST BASELINE')
        print('='*60 + '\n')
    
    lgb_test_recall = recall_score(y_test, y_test_pred_lgb)
    xgb_test_recall = recall_score(y_test, y_test_pred_xgb)
    lgb_test_precision = precision_score(y_test, y_test_pred_lgb)
    xgb_test_precision = precision_score(y_test, y_test_pred_xgb)
    
    if verbose:
        print(f'Test Recall:')
        print(f'  LightGBM: {lgb_test_recall:.4f}')
        print(f'  XGBoost:  {xgb_test_recall:.4f}')
        print(f'  Difference: {(lgb_test_recall - xgb_test_recall):+.4f}')
        
        print(f'\nTest Precision:')
        print(f'  LightGBM: {lgb_test_precision:.4f}')
        print(f'  XGBoost:  {xgb_test_precision:.4f}')
        print(f'  Difference: {(lgb_test_precision - xgb_test_precision):+.4f}')
        
        if lgb_test_recall > xgb_test_recall:
            improvement = ((lgb_test_recall - xgb_test_recall) / xgb_test_recall) * 100
            print(f'\n✅ LightGBM achieves {improvement:.2f}% better recall than XGBoost!')
        elif lgb_test_recall < xgb_test_recall:
            decline = ((xgb_test_recall - lgb_test_recall) / xgb_test_recall) * 100
            print(f'\n⚠️  LightGBM recall is {decline:.2f}% lower than XGBoost')
        else:
            print(f'\n➡️  LightGBM and XGBoost achieve the same recall')
    
    return {
        'lgb_recall': lgb_test_recall,
        'xgb_recall': xgb_test_recall,
        'lgb_precision': lgb_test_precision,
        'xgb_precision': xgb_test_precision
    }


def train_and_evaluate_lightgbm(X_train, y_train, X_test, y_test, 
                                y_train_pred_xgb, y_test_pred_xgb, 
                                verbose=True):
    """Complete LightGBM training and evaluation pipeline with XGBoost features"""
    
    # Train model
    model = train_lightgbm(X_train, y_train, verbose=verbose)
    
    # Evaluate model
    y_train_pred_lgb, y_test_pred_lgb = evaluate_lightgbm(
        model, X_train, y_train, X_test, y_test, verbose=verbose
    )
    
    # Feature importance
    feature_importance = get_feature_importance(model, X_train, verbose=verbose)
    
    # Compare with XGBoost
    comparison = compare_with_xgboost(y_test, y_test_pred_lgb, y_test_pred_xgb, verbose=verbose)
    
    if verbose:
        print('\n' + '='*60)
        print('LightGBM training and evaluation complete!')
        print('='*60)
    
    return model, y_train_pred_lgb, y_test_pred_lgb, feature_importance, comparison
