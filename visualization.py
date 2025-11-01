"""
Visualization utilities for fraud detection
"""
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.feature_selection import chi2
from sklearn.preprocessing import MinMaxScaler


def plot_pearson_correlation(df, top_n=30):
    """Create Pearson correlation matrix visualization"""
    print('Creating Pearson correlation matrix...\n')
    
    pearson_corr = df.corr(method='pearson')
    
    if 'isFraud' in pearson_corr.columns:
        fraud_corr = pearson_corr['isFraud'].drop('isFraud').abs().sort_values(ascending=False)
        print(f'Top 15 features most correlated with isFraud (Pearson):')
        print(fraud_corr.head(15))
    
    plt.figure(figsize=(20, 16))
    
    if len(pearson_corr.columns) > 50:
        top_features = fraud_corr.head(top_n).index.tolist()
        if 'isFraud' not in top_features:
            top_features.append('isFraud')
        
        pearson_subset = pearson_corr.loc[top_features, top_features]
        sns.heatmap(pearson_subset, annot=False, cmap='coolwarm', center=0, 
                    square=True, linewidths=0.5, cbar_kws={"shrink": 0.8},
                    vmin=-1, vmax=1)
        plt.title(f'Pearson Correlation Matrix (Top {top_n} features + isFraud)', 
                  fontsize=16, fontweight='bold', pad=20)
    else:
        sns.heatmap(pearson_corr, annot=False, cmap='coolwarm', center=0,
                    square=True, linewidths=0.5, cbar_kws={"shrink": 0.8},
                    vmin=-1, vmax=1)
        plt.title('Pearson Correlation Matrix (All Features)', 
                  fontsize=16, fontweight='bold', pad=20)
    
    plt.xlabel('Features', fontsize=12)
    plt.ylabel('Features', fontsize=12)
    plt.tight_layout()
    plt.show()


def plot_chi_squared_analysis(df, top_n=30):
    """Create Chi-squared association analysis"""
    print('\nChi-squared Association Analysis...\n')
    
    df_chi = df.copy()
    
    if 'isFraud' not in df_chi.columns:
        print('isFraud column not found - skipping')
        return
    
    X_chi = df_chi.drop(columns=['isFraud'])
    y_chi = df_chi['isFraud']
    
    X_chi = X_chi.fillna(X_chi.median())
    
    scaler = MinMaxScaler()
    X_chi_scaled = scaler.fit_transform(X_chi)
    X_chi_scaled_df = pd.DataFrame(X_chi_scaled, columns=X_chi.columns)
    
    chi2_scores, p_values = chi2(X_chi_scaled_df, y_chi)
    
    chi2_df = pd.DataFrame({
        'Feature': X_chi.columns,
        'Chi2_Score': chi2_scores,
        'P_Value': p_values
    }).sort_values('Chi2_Score', ascending=False)
    
    print(f'Top 15 features by Chi-squared score:')
    print(chi2_df.head(15).to_string(index=False))
    
    # Bar plot
    plt.figure(figsize=(12, max(10, len(chi2_df.head(top_n)) * 0.3)))
    top_chi2 = chi2_df.head(top_n)
    
    plt.barh(range(len(top_chi2)), top_chi2['Chi2_Score'], color='steelblue', alpha=0.8)
    plt.yticks(range(len(top_chi2)), top_chi2['Feature'], fontsize=10)
    plt.xlabel('Chi-squared Score', fontsize=12, fontweight='bold')
    plt.ylabel('Features', fontsize=12, fontweight='bold')
    plt.title(f'Top {top_n} Features by Chi-squared Association with isFraud', 
              fontsize=14, fontweight='bold', pad=20)
    plt.gca().invert_yaxis()
    plt.grid(axis='x', alpha=0.3)
    plt.tight_layout()
    plt.show()


def create_correlation_matrices(df):
    """Create both Pearson and Chi-squared correlation matrices"""
    print('='*60)
    print('CORRELATION ANALYSIS')
    print('='*60 + '\n')
    
    plot_pearson_correlation(df)
    plot_chi_squared_analysis(df)
    
    print('\n' + '='*60)
    print('Correlation analysis complete!')
    print('='*60)
