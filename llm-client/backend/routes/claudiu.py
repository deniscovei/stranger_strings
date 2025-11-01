from flask import Blueprint, request, jsonify
import boto3
import os
import psycopg2
import re
import traceback
import sys

# Add parent directory to path to import config
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

claudiu_bp = Blueprint('claudiu', __name__)

# Database connection and context setup
db_context = ""
_conn = None
_cursor = None

def get_db_connection():
    """Get or create database connection"""
    global _conn, _cursor, db_context
    
    if _conn is None or _conn.closed:
        try:
            _conn = psycopg2.connect(os.environ.get('DATABASE_URI'))
            _cursor = _conn.cursor()
            
            # Get table schema
            _cursor.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'transactions'
                ORDER BY ordinal_position;
            """)
            schema_info = _cursor.fetchall()
            schema_text = "\n".join([f"- {col[0]}: {col[1]}" for col in schema_info])
            
            # Get row count
            _cursor.execute("SELECT COUNT(*) FROM transactions;")
            row_count = _cursor.fetchone()[0]
            
            # Get sample data
            _cursor.execute("SELECT * FROM transactions LIMIT 2;")
            samples = _cursor.fetchall()
            col_names = [desc[0] for desc in _cursor.description]
            sample_text = "\n".join([str(dict(zip(col_names, row))) for row in samples])
            
            db_context = f"""You have access to a PostgreSQL database with a 'transactions' table containing {row_count:,} transaction records.

Table Schema (transactions):
{schema_text}

Sample rows:
{sample_text}

IMPORTANT: When users ask questions about the data, you MUST respond with a SQL query wrapped in ```sql``` code blocks.
The system will execute your query and return the results. Only then can you answer based on REAL data.
Always use SELECT queries. Be specific and limit results appropriately (use LIMIT when counting or aggregating large datasets)."""
            
            print(f"✓ Connected to database: {row_count:,} transactions loaded")
            
        except Exception as e:
            db_context = "Database connection failed. Unable to access transaction data."
            print(f"⚠ Warning: Could not connect to database - {e}")
    
    return _cursor, db_context

def execute_sql_query(query):
    """Execute a SQL query and return results"""
    try:
        cursor, _ = get_db_connection()
        cursor.execute(query)
        
        if query.strip().upper().startswith('SELECT'):
            results = cursor.fetchall()
            column_names = [desc[0] for desc in cursor.description]
            return {"columns": column_names, "rows": results, "success": True}
        else:
            return {"error": "Only SELECT queries are allowed", "success": False}
    except Exception as e:
        return {"error": str(e), "success": False}

def call_bedrock_llm(user_message, conversation_history=None):
    """Call AWS Bedrock Claude model"""
    try:
        # Create Bedrock client with bearer token
        bearer_token = os.environ.get('AWS_BEARER_TOKEN_BEDROCK')
        if not bearer_token:
            return {
                "success": False,
                "error": "AWS_BEARER_TOKEN_BEDROCK not configured in environment"
            }
        
        client = boto3.client(
            service_name="bedrock-runtime",
            region_name="us-west-2",
            aws_session_token=bearer_token
        )
        
        model_id = "us.anthropic.claude-sonnet-4-20250514-v1:0"
        
        # Get database context
        _, db_ctx = get_db_connection()
        
        # Build conversation
        if conversation_history:
            conversation = conversation_history + [
                {
                    "role": "user",
                    "content": [{"text": user_message}],
                }
            ]
        else:
            conversation = [
                {
                    "role": "user",
                    "content": [{"text": user_message}],
                }
            ]
        
        # Send message to Claude
        response = client.converse(
            modelId=model_id,
            messages=conversation,
            system=[{"text": db_ctx}],
            inferenceConfig={"maxTokens": 2048, "temperature": 0.7},
        )
        
        response_text = response["output"]["message"]["content"][0]["text"]
        
        return {
            "success": True,
            "response": response_text,
            "conversation": conversation
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }

@claudiu_bp.route('/chat', methods=['POST'])
def chat():
    """
    Chat endpoint that simulates aws_client.py functionality
    
    Expected JSON body:
    {
        "message": "How many transactions are there?"
    }
    
    Returns: Plain text response string
    """
    try:
        data = request.get_json()
        
        if not data or 'message' not in data:
            return "Error: Missing required field 'message'", 400
        
        user_message = data['message']
        conversation_history = data.get('conversation_history', [])
        
        # Step 1: Get initial response from Claude
        result = call_bedrock_llm(user_message, conversation_history)
        
        if not result['success']:
            return f"Error: {result.get('error', 'Unknown error')}", 500
        
        response_text = result['response']
        conversation = result['conversation']
        
        # Step 2: Check if response contains SQL query
        if "```sql" in response_text.lower():
            sql_match = re.search(r'```sql\s*(.*?)\s*```', response_text, re.DOTALL | re.IGNORECASE)
            
            if sql_match:
                sql_query = sql_match.group(1).strip()
                
                # Execute the query
                query_result = execute_sql_query(sql_query)
                
                if query_result["success"]:
                    # Step 3: Send results back to Claude for interpretation
                    limited_rows = query_result['rows'][:50]  # Limit for token efficiency
                    followup_message = f"Query results: {limited_rows}"
                    
                    # Build followup conversation
                    followup_conversation = conversation + [
                        {"role": "assistant", "content": [{"text": response_text}]},
                        {"role": "user", "content": [{"text": followup_message}]}
                    ]
                    
                    try:
                        client = boto3.client(
                            service_name="bedrock-runtime",
                            region_name="us-west-2",
                            aws_session_token=os.environ.get('AWS_BEARER_TOKEN_BEDROCK')
                        )
                        
                        _, db_ctx = get_db_connection()
                        
                        followup_response = client.converse(
                            modelId="us.anthropic.claude-sonnet-4-20250514-v1:0",
                            messages=followup_conversation,
                            system=[{"text": db_ctx}],
                            inferenceConfig={"maxTokens": 1024, "temperature": 0.7},
                        )
                        
                        interpretation = followup_response["output"]["message"]["content"][0]["text"]
                        return interpretation, 200
                        
                    except Exception as e:
                        return f"Error interpreting results: {str(e)}", 500
                else:
                    return f"SQL Error: {query_result['error']}", 500
        
        # No SQL query, return original response
        return response_text, 200
        
    except Exception as e:
        return f"Error: {str(e)}", 500

@claudiu_bp.route('/chat/simple', methods=['POST'])
def chat_simple():
    """
    Simplified chat endpoint without automatic SQL execution
    
    Expected JSON body:
    {
        "message": "What is fraud detection?"
    }
    
    Returns:
    {
        "response": "Fraud detection is..."
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({
                'error': 'Missing required field: message'
            }), 400
        
        user_message = data['message']
        
        result = call_bedrock_llm(user_message)
        
        if not result['success']:
            return jsonify({
                'error': result.get('error', 'Unknown error'),
                'traceback': result.get('traceback', '')
            }), 500
        
        return jsonify({
            "response": result['response']
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@claudiu_bp.route('/execute-sql', methods=['POST'])
def execute_sql():
    """
    Execute a SQL query directly
    
    Expected JSON body:
    {
        "query": "SELECT COUNT(*) FROM transactions;"
    }
    
    Returns:
    {
        "columns": ["count"],
        "rows": [[1000000]],
        "success": true
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'query' not in data:
            return jsonify({
                'error': 'Missing required field: query'
            }), 400
        
        query = data['query']
        
        # Security check - only allow SELECT
        if not query.strip().upper().startswith('SELECT'):
            return jsonify({
                'error': 'Only SELECT queries are allowed',
                'success': False
            }), 400
        
        result = execute_sql_query(query)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc(),
            'success': False
        }), 500
