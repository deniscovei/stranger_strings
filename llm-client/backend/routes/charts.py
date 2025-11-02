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
                CASE WHEN isfraud = true THEN 'Fraud' ELSE 'Non-Fraud' END as name,
                COUNT(*) as count
            FROM transactions
            GROUP BY isfraud
        """)
        result['fraudDistribution'] = [
            {'name': row[0], 'count': row[1]} 
            for row in cursor.fetchall()
        ]
        
        # 2. Top 15 Merchants
        cursor.execute("""
            SELECT merchantname as name, COUNT(*) as count
            FROM transactions
            GROUP BY merchantname
            ORDER BY count DESC
            LIMIT 15
        """)
        result['topMerchants'] = [
            {'name': row[0], 'count': row[1]} 
            for row in cursor.fetchall()
        ]
        
        # 3. Transaction Types
        cursor.execute("""
            SELECT transactiontype as name, COUNT(*) as value
            FROM transactions
            GROUP BY transactiontype
        """)
        result['transactionTypes'] = [
            {'name': row[0], 'value': row[1]} 
            for row in cursor.fetchall()
        ]
        
        # 4. Fraud Rate by Category
        cursor.execute("""
            SELECT 
                merchantcategorycode as category,
                ROUND(AVG(CASE WHEN isfraud = true THEN 100.0 ELSE 0.0 END), 2) as fraudrate,
                COUNT(*) as total
            FROM transactions
            GROUP BY merchantcategorycode
            HAVING COUNT(*) > 100
            ORDER BY fraudrate DESC
            LIMIT 15
        """)
        result['fraudByCategory'] = [
            {'category': row[0], 'fraudRate': float(row[1]), 'total': row[2]} 
            for row in cursor.fetchall()
        ]
        
        # 5. Top Countries
        cursor.execute("""
            SELECT merchantcountrycode as country, COUNT(*) as count
            FROM transactions
            GROUP BY merchantcountrycode
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
                CASE WHEN cardpresent = true THEN 'Present' ELSE 'Not Present' END as status,
                ROUND(AVG(CASE WHEN isfraud = true THEN 100.0 ELSE 0.0 END), 2) as fraudrate,
                COUNT(*) as total
            FROM transactions
            GROUP BY cardpresent
        """)
        result['cardPresent'] = [
            {'status': row[0], 'fraudRate': float(row[1]), 'total': row[2]} 
            for row in cursor.fetchall()
        ]
        
        # 7. Amount Statistics
        cursor.execute("""
            SELECT 
                CASE WHEN isfraud = true THEN 'Fraud' ELSE 'Non-Fraud' END as type,
                ROUND(AVG(transactionamount)::numeric, 2) as mean,
                ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY transactionamount)::numeric, 2) as median
            FROM transactions
            GROUP BY isfraud
        """)
        result['amountStats'] = [
            {'type': row[0], 'mean': float(row[1]), 'median': float(row[2])} 
            for row in cursor.fetchall()
        ]
        
        # 8. Fraud Trend Over Time (by month)
        cursor.execute("""
            SELECT 
                TO_CHAR(transactiondatetime, 'YYYY-MM') as month,
                COUNT(*) as total,
                SUM(CASE WHEN isfraud = true THEN 1 ELSE 0 END) as frauds,
                ROUND(AVG(CASE WHEN isfraud = true THEN 100.0 ELSE 0.0 END), 2) as fraudrate
            FROM transactions
            WHERE transactiondatetime IS NOT NULL
            GROUP BY TO_CHAR(transactiondatetime, 'YYYY-MM')
            ORDER BY month
            LIMIT 24
        """)
        result['fraudTrend'] = [
            {'month': row[0], 'total': row[1], 'frauds': row[2], 'fraudRate': float(row[3])} 
            for row in cursor.fetchall()
        ]
        
        # 9. Transaction Amount Distribution (bins)
        cursor.execute("""
            WITH binned_data AS (
                SELECT 
                    CASE 
                        WHEN transactionamount < 50 THEN '0-50'
                        WHEN transactionamount < 100 THEN '50-100'
                        WHEN transactionamount < 200 THEN '100-200'
                        WHEN transactionamount < 500 THEN '200-500'
                        WHEN transactionamount < 1000 THEN '500-1000'
                        ELSE '1000+'
                    END as range,
                    CASE 
                        WHEN transactionamount < 50 THEN 1
                        WHEN transactionamount < 100 THEN 2
                        WHEN transactionamount < 200 THEN 3
                        WHEN transactionamount < 500 THEN 4
                        WHEN transactionamount < 1000 THEN 5
                        ELSE 6
                    END as range_order,
                    isfraud
                FROM transactions
            )
            SELECT 
                range,
                COUNT(*) as count,
                SUM(CASE WHEN isfraud = true THEN 1 ELSE 0 END) as frauds
            FROM binned_data
            GROUP BY range, range_order
            ORDER BY range_order
        """)
        result['amountDistribution'] = [
            {'range': row[0], 'count': row[1], 'frauds': row[2]} 
            for row in cursor.fetchall()
        ]
        
        # 10. Fraud by Hour of Day
        cursor.execute("""
            SELECT 
                EXTRACT(HOUR FROM transactiondatetime) as hour,
                COUNT(*) as total,
                SUM(CASE WHEN isfraud = true THEN 1 ELSE 0 END) as frauds,
                ROUND(AVG(CASE WHEN isfraud = true THEN 100.0 ELSE 0.0 END), 2) as fraudrate
            FROM transactions
            WHERE transactiondatetime IS NOT NULL
            GROUP BY EXTRACT(HOUR FROM transactiondatetime)
            ORDER BY hour
        """)
        result['fraudByHour'] = [
            {'hour': int(row[0]) if row[0] is not None else 0, 'total': row[1], 'frauds': row[2], 'fraudRate': float(row[3])} 
            for row in cursor.fetchall()
        ]
        
        # 11. Top Merchants by Fraud Count
        cursor.execute("""
            SELECT 
                merchantname as name,
                COUNT(*) as total,
                SUM(CASE WHEN isfraud = true THEN 1 ELSE 0 END) as frauds,
                ROUND(AVG(CASE WHEN isfraud = true THEN 100.0 ELSE 0.0 END), 2) as fraudrate
            FROM transactions
            GROUP BY merchantname
            HAVING SUM(CASE WHEN isfraud = true THEN 1 ELSE 0 END) > 0
            ORDER BY frauds DESC
            LIMIT 10
        """)
        result['topFraudMerchants'] = [
            {'name': row[0], 'total': row[1], 'frauds': row[2], 'fraudRate': float(row[3])} 
            for row in cursor.fetchall()
        ]
        
        # 12. Transaction Type vs Fraud
        cursor.execute("""
            SELECT 
                transactiontype as type,
                COUNT(*) as total,
                SUM(CASE WHEN isfraud = true THEN 1 ELSE 0 END) as frauds,
                ROUND(AVG(CASE WHEN isfraud = true THEN 100.0 ELSE 0.0 END), 2) as fraudrate
            FROM transactions
            WHERE transactiontype IS NOT NULL
            GROUP BY transactiontype
            ORDER BY fraudrate DESC
        """)
        result['transactionTypeFraud'] = [
            {'type': row[0], 'total': row[1], 'frauds': row[2], 'fraudRate': float(row[3])} 
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
                SUM(CASE WHEN isfraud = true THEN 1 ELSE 0 END) as fraud_count,
                ROUND(AVG(transactionamount)::numeric, 2) as avg_amount,
                COUNT(DISTINCT merchantname) as unique_merchants,
                COUNT(DISTINCT merchantcountrycode) as unique_countries
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
