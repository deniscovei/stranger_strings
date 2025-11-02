from flask import Blueprint, jsonify, request
import psycopg2
import os
import sys
import traceback
import boto3

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

@charts_bp.route('/generate-chart', methods=['POST'])
def generate_chart():
    """Generate chart data using AI based on user prompt with REAL database data"""
    import json
    import re
    
    try:
        data = request.json
        prompt = data.get('prompt', '')
        
        if not prompt:
            return jsonify({'error': 'Prompt is required'}), 400
        
        # Get AWS bearer token
        bearer_token = os.environ.get('AWS_BEARER_TOKEN_BEDROCK')
        if not bearer_token:
            print("ERROR: AWS_BEARER_TOKEN_BEDROCK not configured")
            return jsonify({'error': 'AWS credentials not configured'}), 500
        
        print(f"Generating chart for prompt: {prompt}")
        
        # FETCH REAL DATA FROM DATABASE
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get comprehensive statistics from the database
        real_data = {}
        
        # Fraud distribution
        cursor.execute("""
            SELECT 
                CASE WHEN isfraud = true THEN 'Fraudulent' ELSE 'Legitimate' END as type,
                COUNT(*) as count
            FROM transactions
            GROUP BY isfraud
        """)
        real_data['fraud_distribution'] = [{'type': row[0], 'count': row[1]} for row in cursor.fetchall()]
        
        # Top merchants
        cursor.execute("""
            SELECT merchantname, COUNT(*) as count,
                   SUM(CASE WHEN isfraud = true THEN 1 ELSE 0 END) as fraud_count
            FROM transactions
            GROUP BY merchantname
            ORDER BY count DESC
            LIMIT 15
        """)
        real_data['top_merchants'] = [{'name': row[0], 'total': row[1], 'frauds': row[2]} for row in cursor.fetchall()]
        
        # Transaction types
        cursor.execute("""
            SELECT transactiontype, COUNT(*) as count
            FROM transactions
            GROUP BY transactiontype
        """)
        real_data['transaction_types'] = [{'type': row[0], 'count': row[1]} for row in cursor.fetchall()]
        
        # Fraud by category
        cursor.execute("""
            SELECT merchantcategorycode,
                   COUNT(*) as total,
                   SUM(CASE WHEN isfraud = true THEN 1 ELSE 0 END) as frauds,
                   ROUND(AVG(CASE WHEN isfraud = true THEN 100.0 ELSE 0.0 END), 2) as fraud_rate
            FROM transactions
            GROUP BY merchantcategorycode
            HAVING COUNT(*) > 100
            ORDER BY fraud_rate DESC
            LIMIT 15
        """)
        real_data['fraud_by_category'] = [
            {'category': row[0], 'total': row[1], 'frauds': row[2], 'fraud_rate': float(row[3])} 
            for row in cursor.fetchall()
        ]
        
        # Amount statistics
        cursor.execute("""
            SELECT 
                CASE WHEN isfraud = true THEN 'Fraudulent' ELSE 'Legitimate' END as type,
                ROUND(AVG(transactionamount)::numeric, 2) as avg_amount,
                ROUND(MIN(transactionamount)::numeric, 2) as min_amount,
                ROUND(MAX(transactionamount)::numeric, 2) as max_amount,
                COUNT(*) as count
            FROM transactions
            GROUP BY isfraud
        """)
        real_data['amount_stats'] = [
            {'type': row[0], 'avg': float(row[1]), 'min': float(row[2]), 'max': float(row[3]), 'count': row[4]} 
            for row in cursor.fetchall()
        ]
        
        # Fraud by hour
        cursor.execute("""
            SELECT EXTRACT(HOUR FROM transactiondatetime) as hour,
                   COUNT(*) as total,
                   SUM(CASE WHEN isfraud = true THEN 1 ELSE 0 END) as frauds
            FROM transactions
            WHERE transactiondatetime IS NOT NULL
            GROUP BY EXTRACT(HOUR FROM transactiondatetime)
            ORDER BY hour
        """)
        real_data['fraud_by_hour'] = [
            {'hour': int(row[0]), 'total': row[1], 'frauds': row[2]} 
            for row in cursor.fetchall()
        ]
        
        # Countries
        cursor.execute("""
            SELECT merchantcountrycode, COUNT(*) as count
            FROM transactions
            GROUP BY merchantcountrycode
            ORDER BY count DESC
            LIMIT 10
        """)
        real_data['top_countries'] = [{'country': row[0], 'count': row[1]} for row in cursor.fetchall()]
        
        # Top customers by fraud count (most fraudulent customers)
        cursor.execute("""
            SELECT 
                accountnumber as customer_id,
                COUNT(*) as total_transactions,
                SUM(CASE WHEN isfraud = true THEN 1 ELSE 0 END) as fraud_count,
                ROUND(AVG(CASE WHEN isfraud = true THEN 100.0 ELSE 0.0 END), 2) as fraud_rate
            FROM transactions
            GROUP BY accountnumber
            HAVING SUM(CASE WHEN isfraud = true THEN 1 ELSE 0 END) > 0
            ORDER BY fraud_count DESC
            LIMIT 15
        """)
        real_data['top_fraud_customers'] = [
            {'customer_id': row[0], 'total': row[1], 'frauds': row[2], 'fraud_rate': float(row[3])} 
            for row in cursor.fetchall()
        ]
        
        # Top customers by transaction count (most active customers)
        cursor.execute("""
            SELECT 
                accountnumber as customer_id,
                COUNT(*) as total_transactions,
                SUM(CASE WHEN isfraud = true THEN 1 ELSE 0 END) as fraud_count,
                ROUND(AVG(transactionamount)::numeric, 2) as avg_amount
            FROM transactions
            GROUP BY accountnumber
            ORDER BY total_transactions DESC
            LIMIT 15
        """)
        real_data['top_active_customers'] = [
            {'customer_id': row[0], 'total': row[1], 'frauds': row[2], 'avg_amount': float(row[3])} 
            for row in cursor.fetchall()
        ]
        
        cursor.close()
        conn.close()
        
        # Create system prompt for AI
        system_prompt = """You are a data visualization expert. You will receive REAL data from our database and a user request.
Your job is to select the most relevant data and format it for Chart.js visualization.

Your response MUST be ONLY valid JSON in this exact format:
{
  "type": "bar" | "line" | "pie",
  "data": {
    "labels": ["Label1", "Label2", ...],
    "datasets": [{
      "label": "Dataset Name",
      "data": [value1, value2, ...],
      "backgroundColor": ["color1", "color2", ...],
      "borderColor": "color",
      "fill": false
    }]
  },
  "title": "Chart Title"
}

Guidelines:
- USE ONLY THE REAL DATA PROVIDED - DO NOT MAKE UP NUMBERS
- Select the most relevant data for the user's request
- Keep labels concise (max 20 chars)
- Limit to 12 data points maximum (pick top 12 if more)
- Use colors: #ef4444 (red) for fraud, #10b981 (green) for legitimate, #6366f1 (blue), #8b5cf6 (purple), #f59e0b (amber)
- For pie charts: backgroundColor should be an array of colors (one per data point)
- For bar/line charts: backgroundColor can be single color or array
- Return ONLY the JSON object, no markdown, no explanation
"""

        user_message = f"""User request: {prompt}

REAL DATA FROM DATABASE:
{json.dumps(real_data, indent=2)}

Based on this REAL data, create the appropriate chart. Use the actual numbers from the data above."""

        # Create Bedrock client
        client = boto3.client(
            service_name="bedrock-runtime",
            region_name="us-west-2",
            aws_session_token=bearer_token
        )
        
        # Call LLM
        model_id = "us.anthropic.claude-sonnet-4-20250514-v1:0"
        
        response = client.converse(
            modelId=model_id,
            messages=[{
                "role": "user",
                "content": [{"text": user_message}]
            }],
            system=[{"text": system_prompt}],
            inferenceConfig={
                "maxTokens": 2000,
                "temperature": 0.7
            }
        )
        
        # Extract response
        ai_response = response['output']['message']['content'][0]['text']
        print(f"AI Response: {ai_response[:500]}...")
        
        # Clean and parse JSON
        ai_response = re.sub(r'```json\s*', '', ai_response)
        ai_response = re.sub(r'```\s*', '', ai_response)
        ai_response = ai_response.strip()
        
        # Parse JSON
        chart_config = json.loads(ai_response)
        
        # Validate structure
        if 'type' not in chart_config or 'data' not in chart_config:
            raise ValueError("Invalid chart configuration from AI")
        
        print(f"Successfully generated {chart_config.get('type')} chart")
        
        return jsonify(chart_config), 200
        
    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {e}")
        return jsonify({
            'error': 'Failed to parse AI response',
            'details': str(e)
        }), 500
    except Exception as e:
        print(f"Error generating chart: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({
            'error': 'Failed to generate chart',
            'details': str(e)
        }), 500
