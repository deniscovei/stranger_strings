import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from pathlib import Path

# Set style
sns.set_style("whitegrid")
plt.rcParams['figure.figsize'] = (12, 8)

# Load data
data_path = Path(__file__).parent.parent / 'dataset' / 'transactions'
print(f"Loading data from: {data_path}")

df = pd.read_csv(data_path)
print(f"Loaded {len(df)} transactions")
print(f"Columns: {df.columns.tolist()}\n")

# Create output directory for plots
output_dir = Path(__file__).parent / 'plots'
output_dir.mkdir(exist_ok=True)

# 1. Fraud Distribution
plt.figure(figsize=(10, 6))
fraud_counts = df['isFraud'].value_counts()
colors = ['#2ecc71', '#e74c3c']
plt.bar(['Non-Fraud', 'Fraud'], fraud_counts.values, color=colors)
plt.title('Distribution of Fraudulent vs Non-Fraudulent Transactions', fontsize=16, fontweight='bold')
plt.ylabel('Number of Transactions', fontsize=12)
plt.xlabel('Transaction Type', fontsize=12)
for i, v in enumerate(fraud_counts.values):
    plt.text(i, v + max(fraud_counts.values)*0.01, f'{v:,}\n({v/len(df)*100:.2f}%)', 
             ha='center', va='bottom', fontsize=11, fontweight='bold')
plt.tight_layout()
plt.savefig(output_dir / '1_fraud_distribution.png', dpi=300, bbox_inches='tight')
print(f"✓ Saved: 1_fraud_distribution.png")
plt.close()

# 2. Transaction Amount Distribution by Fraud
plt.figure(figsize=(12, 6))
plt.subplot(1, 2, 1)
df[df['isFraud'] == False]['transactionAmount'].hist(bins=50, color='#2ecc71', alpha=0.7, edgecolor='black')
plt.title('Non-Fraudulent Transaction Amounts', fontsize=14, fontweight='bold')
plt.xlabel('Amount ($)', fontsize=11)
plt.ylabel('Frequency', fontsize=11)
plt.axvline(df[df['isFraud'] == False]['transactionAmount'].mean(), 
            color='red', linestyle='--', linewidth=2, label=f'Mean: ${df[df["isFraud"] == False]["transactionAmount"].mean():.2f}')
plt.legend()

plt.subplot(1, 2, 2)
df[df['isFraud'] == True]['transactionAmount'].hist(bins=50, color='#e74c3c', alpha=0.7, edgecolor='black')
plt.title('Fraudulent Transaction Amounts', fontsize=14, fontweight='bold')
plt.xlabel('Amount ($)', fontsize=11)
plt.ylabel('Frequency', fontsize=11)
plt.axvline(df[df['isFraud'] == True]['transactionAmount'].mean(), 
            color='blue', linestyle='--', linewidth=2, label=f'Mean: ${df[df["isFraud"] == True]["transactionAmount"].mean():.2f}')
plt.legend()
plt.tight_layout()
plt.savefig(output_dir / '2_amount_distribution.png', dpi=300, bbox_inches='tight')
print(f"✓ Saved: 2_amount_distribution.png")
plt.close()

# 3. Top 10 Merchants
plt.figure(figsize=(12, 8))
top_merchants = df['merchantName'].value_counts().head(10)
colors_gradient = plt.cm.viridis(np.linspace(0, 1, 10))
plt.barh(range(len(top_merchants)), top_merchants.values, color=colors_gradient)
plt.yticks(range(len(top_merchants)), top_merchants.index)
plt.title('Top 10 Merchants by Transaction Count', fontsize=16, fontweight='bold')
plt.xlabel('Number of Transactions', fontsize=12)
plt.ylabel('Merchant Name', fontsize=12)
for i, v in enumerate(top_merchants.values):
    plt.text(v + max(top_merchants.values)*0.01, i, f'{v:,}', 
             va='center', fontsize=10)
plt.tight_layout()
plt.savefig(output_dir / '3_top_merchants.png', dpi=300, bbox_inches='tight')
print(f"✓ Saved: 3_top_merchants.png")
plt.close()

# 4. Fraud Rate by Merchant Category
plt.figure(figsize=(14, 8))
category_fraud = df.groupby('merchantCategoryCode').agg({
    'isFraud': ['sum', 'count']
}).reset_index()
category_fraud.columns = ['Category', 'Fraud_Count', 'Total_Count']
category_fraud['Fraud_Rate'] = (category_fraud['Fraud_Count'] / category_fraud['Total_Count'] * 100)
category_fraud = category_fraud.sort_values('Fraud_Rate', ascending=False).head(15)

colors = ['#e74c3c' if rate > 5 else '#f39c12' if rate > 2 else '#2ecc71' 
          for rate in category_fraud['Fraud_Rate']]
plt.barh(range(len(category_fraud)), category_fraud['Fraud_Rate'], color=colors)
plt.yticks(range(len(category_fraud)), category_fraud['Category'])
plt.title('Fraud Rate by Merchant Category (Top 15)', fontsize=16, fontweight='bold')
plt.xlabel('Fraud Rate (%)', fontsize=12)
plt.ylabel('Merchant Category', fontsize=12)
for i, (rate, count) in enumerate(zip(category_fraud['Fraud_Rate'], category_fraud['Total_Count'])):
    plt.text(rate + 0.1, i, f'{rate:.2f}% (n={count:,})', 
             va='center', fontsize=9)
plt.tight_layout()
plt.savefig(output_dir / '4_fraud_by_category.png', dpi=300, bbox_inches='tight')
print(f"✓ Saved: 4_fraud_by_category.png")
plt.close()

# 5. Transaction Type Distribution
plt.figure(figsize=(12, 6))
transaction_types = df['transactionType'].value_counts()
colors = plt.cm.Set3(range(len(transaction_types)))
plt.pie(transaction_types.values, labels=transaction_types.index, autopct='%1.1f%%',
        colors=colors, startangle=90, textprops={'fontsize': 12, 'fontweight': 'bold'})
plt.title('Distribution of Transaction Types', fontsize=16, fontweight='bold', pad=20)
plt.tight_layout()
plt.savefig(output_dir / '5_transaction_types.png', dpi=300, bbox_inches='tight')
print(f"✓ Saved: 5_transaction_types.png")
plt.close()

# 6. Country Distribution
plt.figure(figsize=(12, 6))
country_counts = df['merchantCountryCode'].value_counts().head(10)
plt.bar(range(len(country_counts)), country_counts.values, color='#3498db')
plt.xticks(range(len(country_counts)), country_counts.index, fontsize=11)
plt.title('Top 10 Countries by Transaction Count', fontsize=16, fontweight='bold')
plt.ylabel('Number of Transactions', fontsize=12)
plt.xlabel('Country Code', fontsize=12)
for i, v in enumerate(country_counts.values):
    plt.text(i, v + max(country_counts.values)*0.01, f'{v:,}', 
             ha='center', va='bottom', fontsize=10, fontweight='bold')
plt.tight_layout()
plt.savefig(output_dir / '6_country_distribution.png', dpi=300, bbox_inches='tight')
print(f"✓ Saved: 6_country_distribution.png")
plt.close()

# 7. Card Present vs Not Present
plt.figure(figsize=(10, 6))
card_present = df.groupby('cardPresent')['isFraud'].agg(['sum', 'count'])
card_present['fraud_rate'] = (card_present['sum'] / card_present['count'] * 100)

x = ['Card Not Present', 'Card Present']
fraud_rates = [card_present.loc[False, 'fraud_rate'], card_present.loc[True, 'fraud_rate']]
colors = ['#e74c3c', '#2ecc71']
bars = plt.bar(x, fraud_rates, color=colors, alpha=0.7, edgecolor='black', linewidth=2)

plt.title('Fraud Rate: Card Present vs Not Present', fontsize=16, fontweight='bold')
plt.ylabel('Fraud Rate (%)', fontsize=12)
plt.xlabel('Card Status', fontsize=12)
for i, (bar, rate, total) in enumerate(zip(bars, fraud_rates, [card_present.loc[False, 'count'], card_present.loc[True, 'count']])):
    plt.text(bar.get_x() + bar.get_width()/2, rate + 0.1, 
             f'{rate:.2f}%\n(n={total:,})', 
             ha='center', va='bottom', fontsize=11, fontweight='bold')
plt.tight_layout()
plt.savefig(output_dir / '7_card_present_fraud.png', dpi=300, bbox_inches='tight')
print(f"✓ Saved: 7_card_present_fraud.png")
plt.close()

# 8. CVV Match Analysis
plt.figure(figsize=(10, 6))
df['cvv_match'] = df['cardCVV'] == df['enteredCVV']
cvv_fraud = df.groupby('cvv_match')['isFraud'].agg(['sum', 'count'])
cvv_fraud['fraud_rate'] = (cvv_fraud['sum'] / cvv_fraud['count'] * 100)

x = ['CVV Mismatch', 'CVV Match']
fraud_rates = [cvv_fraud.loc[False, 'fraud_rate'], cvv_fraud.loc[True, 'fraud_rate']]
colors = ['#e74c3c', '#2ecc71']
bars = plt.bar(x, fraud_rates, color=colors, alpha=0.7, edgecolor='black', linewidth=2)

plt.title('Fraud Rate: CVV Match vs Mismatch', fontsize=16, fontweight='bold')
plt.ylabel('Fraud Rate (%)', fontsize=12)
plt.xlabel('CVV Status', fontsize=12)
for i, (bar, rate, total) in enumerate(zip(bars, fraud_rates, [cvv_fraud.loc[False, 'count'], cvv_fraud.loc[True, 'count']])):
    plt.text(bar.get_x() + bar.get_width()/2, rate + 0.1, 
             f'{rate:.2f}%\n(n={total:,})', 
             ha='center', va='bottom', fontsize=11, fontweight='bold')
plt.tight_layout()
plt.savefig(output_dir / '8_cvv_match_fraud.png', dpi=300, bbox_inches='tight')
print(f"✓ Saved: 8_cvv_match_fraud.png")
plt.close()

# 9. Transaction Amount Box Plot
plt.figure(figsize=(10, 6))
data_to_plot = [df[df['isFraud'] == False]['transactionAmount'], 
                df[df['isFraud'] == True]['transactionAmount']]
bp = plt.boxplot(data_to_plot, labels=['Non-Fraud', 'Fraud'], patch_artist=True)
bp['boxes'][0].set_facecolor('#2ecc71')
bp['boxes'][1].set_facecolor('#e74c3c')
plt.title('Transaction Amount Distribution (Box Plot)', fontsize=16, fontweight='bold')
plt.ylabel('Transaction Amount ($)', fontsize=12)
plt.xlabel('Transaction Type', fontsize=12)
plt.grid(axis='y', alpha=0.3)
plt.tight_layout()
plt.savefig(output_dir / '9_amount_boxplot.png', dpi=300, bbox_inches='tight')
print(f"✓ Saved: 9_amount_boxplot.png")
plt.close()

# 10. Correlation Heatmap (numeric features)
plt.figure(figsize=(12, 10))
numeric_cols = ['transactionAmount', 'availableMoney', 'currentBalance', 'creditLimit', 
                'posEntryMode', 'posConditionCode', 'isFraud']
numeric_cols = [col for col in numeric_cols if col in df.columns]
corr_matrix = df[numeric_cols].corr()
sns.heatmap(corr_matrix, annot=True, fmt='.2f', cmap='coolwarm', center=0,
            square=True, linewidths=1, cbar_kws={"shrink": 0.8})
plt.title('Correlation Matrix of Numeric Features', fontsize=16, fontweight='bold', pad=20)
plt.tight_layout()
plt.savefig(output_dir / '10_correlation_heatmap.png', dpi=300, bbox_inches='tight')
print(f"✓ Saved: 10_correlation_heatmap.png")
plt.close()

print(f"\n{'='*60}")
print(f"All plots saved successfully in: {output_dir}")
print(f"{'='*60}")

# Print summary statistics
print("\n📊 SUMMARY STATISTICS:")
print(f"Total Transactions: {len(df):,}")
print(f"Fraudulent Transactions: {df['isFraud'].sum():,} ({df['isFraud'].mean()*100:.2f}%)")
print(f"Non-Fraudulent Transactions: {(~df['isFraud']).sum():,} ({(~df['isFraud']).mean()*100:.2f}%)")
print(f"\nAverage Transaction Amount:")
print(f"  - All: ${df['transactionAmount'].mean():.2f}")
print(f"  - Non-Fraud: ${df[df['isFraud']==False]['transactionAmount'].mean():.2f}")
print(f"  - Fraud: ${df[df['isFraud']==True]['transactionAmount'].mean():.2f}")
print(f"\nMost Common Merchant: {df['merchantName'].mode()[0]}")
print(f"Most Common Category: {df['merchantCategoryCode'].mode()[0]}")
print(f"Most Common Country: {df['merchantCountryCode'].mode()[0]}")
