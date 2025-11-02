from flask import Blueprint, jsonify, request
import psycopg2
import os
import sys
import traceback

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

sql_query_bp = Blueprint('sql_query', __name__)

def get_db_connection():
    """Get database connection"""
    return psycopg2.connect(os.environ.get('DATABASE_URI'))

@sql_query_bp.route('/sql/execute', methods=['POST'])
def execute_query():
    """
    Execute a SQL query and return results
    
    Request body:
    {
        "query": "SELECT * FROM transactions LIMIT 10"
    }
    
    Returns:
    {
        "columns": ["column1", "column2", ...],
        "rows": [[value1, value2, ...], ...],
        "rowCount": 10,
        "executionTime": 0.123
    }
    """
    try:
        data = request.get_json()
        query = data.get('query', '').strip()
        
        if not query:
            return jsonify({'error': 'Query cannot be empty'}), 400
        
        # Basic security: only allow SELECT queries
        query_upper = query.upper().strip()
        if not query_upper.startswith('SELECT'):
            return jsonify({'error': 'Only SELECT queries are allowed'}), 400
        
        # Check for dangerous keywords
        dangerous_keywords = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE']
        for keyword in dangerous_keywords:
            if keyword in query_upper:
                return jsonify({'error': f'Forbidden keyword: {keyword}'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        import time
        start_time = time.time()
        
        cursor.execute(query)
        
        execution_time = time.time() - start_time
        
        # Get column names
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        
        # Fetch all rows
        rows = cursor.fetchall()
        
        # Convert rows to list of lists (for JSON serialization)
        rows_list = [list(row) for row in rows]
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'columns': columns,
            'rows': rows_list,
            'rowCount': len(rows_list),
            'executionTime': round(execution_time, 3)
        }), 200
        
    except psycopg2.Error as e:
        return jsonify({
            'error': str(e),
            'errorType': 'DatabaseError',
            'traceback': traceback.format_exc()
        }), 400
    except Exception as e:
        return jsonify({
            'error': str(e),
            'errorType': type(e).__name__,
            'traceback': traceback.format_exc()
        }), 500

@sql_query_bp.route('/sql/tables', methods=['GET'])
def get_tables():
    """Get list of all tables in the database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        
        tables = [row[0] for row in cursor.fetchall()]
        
        cursor.close()
        conn.close()
        
        return jsonify({'tables': tables}), 200
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@sql_query_bp.route('/sql/table/<table_name>/schema', methods=['GET'])
def get_table_schema(table_name):
    """Get schema (columns) for a specific table"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            ORDER BY ordinal_position
        """, (table_name,))
        
        columns = []
        for row in cursor.fetchall():
            columns.append({
                'name': row[0],
                'type': row[1],
                'nullable': row[2] == 'YES',
                'default': row[3]
            })
        
        cursor.close()
        conn.close()
        
        return jsonify({'tableName': table_name, 'columns': columns}), 200
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@sql_query_bp.route('/sql/generate', methods=['POST'])
def generate_query():
    """
    Generate SQL query using LLM based on natural language prompt
    
    Request body:
    {
        "prompt": "Show me top 10 fraudulent transactions"
    }
    
    Returns:
    {
        "query": "SELECT * FROM transactions WHERE isfraud = true LIMIT 10",
        "explanation": "This query retrieves..."
    }
    """
    try:
        data = request.get_json()
        prompt = data.get('prompt', '').strip()
        
        if not prompt:
            return jsonify({'error': 'Prompt cannot be empty'}), 400
        
        # Get database schema for context
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        tables = [row[0] for row in cursor.fetchall()]
        
        # Get schema for each table
        schema_info = []
        for table in tables:
            cursor.execute("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = %s
                ORDER BY ordinal_position
            """, (table,))
            columns = [f"{row[0]} ({row[1]})" for row in cursor.fetchall()]
            schema_info.append(f"Table: {table}\nColumns: {', '.join(columns)}")
        
        cursor.close()
        conn.close()
        
        # Import AWS client
        from .aws_client import query_claude
        
        # Build prompt for LLM
        system_prompt = f"""You are a SQL query generator. Given a natural language request, generate a valid PostgreSQL SELECT query.

Database Schema:
{chr(10).join(schema_info)}

Rules:
1. Only generate SELECT queries (no INSERT, UPDATE, DELETE, DROP, etc.)
2. Use proper PostgreSQL syntax
3. Return ONLY the SQL query, nothing else
4. Do not include explanations or markdown formatting
5. Do not use backticks or code blocks
6. Make sure column names and table names match the schema exactly (case-sensitive)
7. Add appropriate LIMIT clauses to avoid returning too many rows (max 1000)"""

        user_prompt = f"Generate a SQL query for: {prompt}"
        
        # Call LLM
        response = query_claude(user_prompt, system_prompt)
        
        # Clean up the response
        generated_query = response.strip()
        
        # Remove markdown code blocks if present
        if generated_query.startswith('```'):
            lines = generated_query.split('\n')
            # Remove first and last lines (code block markers)
            generated_query = '\n'.join(lines[1:-1]).strip()
        
        # Remove 'sql' or 'SQL' if it's the first word
        if generated_query.lower().startswith('sql'):
            generated_query = generated_query[3:].strip()
        
        return jsonify({
            'query': generated_query,
            'prompt': prompt
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'errorType': type(e).__name__,
            'traceback': traceback.format_exc()
        }), 500
