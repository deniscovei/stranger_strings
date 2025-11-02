from flask import Blueprint, jsonify
import psycopg2
import os
import sys
import traceback

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

charts_bp = Blueprint('charts', __name__)

def get_db_connection():
    """Get database connection"""
    return psycopg2.connect(os.environ.get('DATABASE_URI'))

@charts_bp.route('/charts/data', methods=['GET'])
def get_chart_data():
    """
    Get aggregated data for all charts
    
    Returns:
    {
        "fraudDistribution": [...],
        "topMerchants": [...],
        "transactionTypes": [...],
        "fraudByCategory": [...],
        "countries": [...],
        "cardPresent": [...],
        "amountStats": [...]
    }
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        result = {}
        
        # 1. Fraud Distribution
        cursor.execute("""
            SELECT 
                CASE WHEN "isFraud" = true THEN 'Fraud' ELSE 'Non-Fraud' END as name,
                COUNT(*) as count
            FROM transactions
            GROUP BY "isFraud"
        """)
        result['fraudDistribution'] = [
            {'name': row[0], 'count': row[1]} 
            for row in cursor.fetchall()
        ]
        
        # 2. Top 10 Merchants
        cursor.execute("""
            SELECT "merchantName" as name, COUNT(*) as count
            FROM transactions
            GROUP BY "merchantName"
            ORDER BY count DESC
            LIMIT 10
        """)
        result['topMerchants'] = [
            {'name': row[0], 'count': row[1]} 
            for row in cursor.fetchall()
        ]
        
        # 3. Transaction Types
        cursor.execute("""
            SELECT "transactionType" as name, COUNT(*) as value
            FROM transactions
            GROUP BY "transactionType"
        """)
        result['transactionTypes'] = [
            {'name': row[0], 'value': row[1]} 
            for row in cursor.fetchall()
        ]
        
        # 4. Fraud Rate by Category
        cursor.execute("""
            SELECT 
                "merchantCategoryCode" as category,
                ROUND(AVG(CASE WHEN "isFraud" = true THEN 100.0 ELSE 0.0 END), 2) as "fraudRate",
                COUNT(*) as total
            FROM transactions
            GROUP BY "merchantCategoryCode"
            HAVING COUNT(*) > 100
            ORDER BY "fraudRate" DESC
            LIMIT 15
        """)
        result['fraudByCategory'] = [
            {'category': row[0], 'fraudRate': float(row[1]), 'total': row[2]} 
            for row in cursor.fetchall()
        ]
        
        # 5. Top Countries
        cursor.execute("""
            SELECT "merchantCountryCode" as country, COUNT(*) as count
            FROM transactions
            GROUP BY "merchantCountryCode"
            ORDER BY count DESC
            LIMIT 10
        """)
        result['countries'] = [
            {'country': row[0], 'count': row[1]} 
            for row in cursor.fetchall()
        ]
        
        # 6. Card Present Analysis
        cursor.execute("""
            SELECT 
                CASE WHEN "cardPresent" = true THEN 'Present' ELSE 'Not Present' END as status,
                ROUND(AVG(CASE WHEN "isFraud" = true THEN 100.0 ELSE 0.0 END), 2) as "fraudRate",
                COUNT(*) as total
            FROM transactions
            GROUP BY "cardPresent"
        """)
        result['cardPresent'] = [
            {'status': row[0], 'fraudRate': float(row[1]), 'total': row[2]} 
            for row in cursor.fetchall()
        ]
        
        # 7. Amount Statistics
        cursor.execute("""
            SELECT 
                CASE WHEN "isFraud" = true THEN 'Fraud' ELSE 'Non-Fraud' END as type,
                ROUND(AVG("transactionAmount")::numeric, 2) as mean,
                ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "transactionAmount")::numeric, 2) as median
            FROM transactions
            GROUP BY "isFraud"
        """)
        result['amountStats'] = [
            {'type': row[0], 'mean': float(row[1]), 'median': float(row[2])} 
            for row in cursor.fetchall()
        ]
        
        cursor.close()
        conn.close()
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@charts_bp.route('/charts/summary', methods=['GET'])
def get_summary():
    """Get summary statistics"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN "isFraud" = true THEN 1 ELSE 0 END) as fraud_count,
                ROUND(AVG("transactionAmount")::numeric, 2) as avg_amount,
                COUNT(DISTINCT "merchantName") as unique_merchants,
                COUNT(DISTINCT "merchantCountryCode") as unique_countries
            FROM transactions
        """)
        
        row = cursor.fetchone()
        result = {
            'total_transactions': row[0],
            'fraud_count': row[1],
            'fraud_rate': round((row[1] / row[0] * 100), 2) if row[0] > 0 else 0,
            'avg_amount': float(row[2]),
            'unique_merchants': row[3],
            'unique_countries': row[4]
        }
        
        cursor.close()
        conn.close()
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500
