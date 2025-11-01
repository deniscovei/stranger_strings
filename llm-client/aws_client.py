import os
import boto3  # install with command: pip install boto3
from dotenv import load_dotenv  # install with command: pip install python-dotenv
import sys
import psycopg2


# Load environment variables from the .env file
load_dotenv()

# Connect to PostgreSQL and get schema info
db_context = ""
conn = None
cursor = None

def execute_sql_query(query):
    """Execute a SQL query and return results"""
    try:
        cursor.execute(query)
        if query.strip().upper().startswith('SELECT'):
            results = cursor.fetchall()
            column_names = [desc[0] for desc in cursor.description]
            return {"columns": column_names, "rows": results, "success": True}
        else:
            return {"error": "Only SELECT queries are allowed", "success": False}
    except Exception as e:
        return {"error": str(e), "success": False}

try:
    conn = psycopg2.connect(os.environ.get('DATABASE_URI'))
    cursor = conn.cursor()

    # Get table schema
    cursor.execute("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'transactions'
        ORDER BY ordinal_position;
    """)
    schema_info = cursor.fetchall()
    schema_text = "\n".join([f"- {col[0]}: {col[1]}" for col in schema_info])

    # Get row count
    cursor.execute("SELECT COUNT(*) FROM transactions;")
    row_count = cursor.fetchone()[0]

    # Get sample data
    cursor.execute("SELECT * FROM transactions LIMIT 2;")
    samples = cursor.fetchall()
    col_names = [desc[0] for desc in cursor.description]
    sample_text = "\n".join([str(dict(zip(col_names, row))) for row in samples])

    db_context = f"""You have access to a PostgreSQL database with a 'transactions' table containing {row_count:,} transaction records.

Table Schema (transactions):
{schema_text}

Sample rows:
{sample_text}

IMPORTANT: When users ask questions about the data, you MUST respond with a SQL query wrapped in ```sql``` code blocks.
The system will execute your query and return the results. Only then can you answer based on REAL data.
Always use SELECT queries. Be specific and limit results appropriately (use LIMIT when counting or aggregating large datasets)."""

    print(f"✓ Connected to database: {row_count:,} transactions loaded\n")

except Exception as e:
    db_context = "Database connection failed. Unable to access transaction data."
    print(f"⚠ Warning: Could not connect to database - {e}\n")

# Create a Bedrock Runtime client with bearer token auth
client = boto3.client(
    service_name="bedrock-runtime",
    region_name="us-west-2",
    aws_session_token=os.environ['AWS_BEARER_TOKEN_BEDROCK']
)

# Set the model ID, e.g., Claude 4 Sonnet.
model_id = "us.anthropic.claude-sonnet-4-20250514-v1:0"

print("=== AWS Bedrock Chat Client ===")
print("Type 'exit' or 'quit' to end the conversation\n")

# Check if stdin is available (interactive mode)
if not sys.stdin.isatty():
    print("Error: This script requires interactive input (stdin/TTY).")
    print("Run with: docker run -it ...")
    print("Or add 'stdin_open: true' and 'tty: true' to docker-compose.yml")
    sys.exit(1)

# Main conversation loop
while True:
    # Get user input
    try:
        user_message = input("You: ").strip()
    except EOFError:
        print("\nInput stream closed. Exiting.")
        break
    except KeyboardInterrupt:
        print("\nInterrupted. Goodbye!")
        break

    # Check for exit commands
    if user_message.lower() in ['exit', 'quit', 'q']:
        print("Goodbye!")
        break

    # Skip empty messages
    if not user_message:
        continue

    # Create conversation with the user message
    conversation = [
        {
            "role": "user",
            "content": [{"text": user_message}],
        }
    ]

    try:
        # Send the message to the model with database context
        response = client.converse(
            modelId=model_id,
            messages=conversation,
            system=[{"text": db_context}],  # Add database schema as system context
            inferenceConfig={"maxTokens": 2048, "temperature": 0.7},
        )

        # Extract and print the response text
        response_text = response["output"]["message"]["content"][0]["text"]
        print(f"\nClaudiu: {response_text}\n")

        # Check if response contains SQL query
        if "```sql" in response_text.lower():
            # Extract SQL query
            import re
            sql_match = re.search(r'```sql\s*(.*?)\s*```', response_text, re.DOTALL | re.IGNORECASE)
            if sql_match:
                sql_query = sql_match.group(1).strip()
                print(f"🔍 Executing query: {sql_query}\n")

                # Execute the query
                result = execute_sql_query(sql_query)

                if result["success"]:
                    # Format and display results
                    print("📊 Query Results:")
                    print(f"Columns: {', '.join(result['columns'])}")
                    print(f"Rows returned: {len(result['rows'])}\n")

                    for i, row in enumerate(result['rows'][:20], 1):  # Show first 20 rows
                        print(f"{i}. {dict(zip(result['columns'], row))}")

                    if len(result['rows']) > 20:
                        print(f"\n... ({len(result['rows']) - 20} more rows)")
                    print()

                    # Send results back to Claude for interpretation
                    followup = [{
                        "role": "user",
                        "content": [{"text": f"Query results: {result['rows'][:50]}"}]  # Limit for token efficiency
                    }]

                    followup_response = client.converse(
                        modelId=model_id,
                        messages=conversation + [{"role": "assistant", "content": [{"text": response_text}]}] + followup,
                        system=[{"text": db_context}],
                        inferenceConfig={"maxTokens": 1024, "temperature": 0.7},
                    )

                    interpretation = followup_response["output"]["message"]["content"][0]["text"]
                    print(f"Claudiu: {interpretation}\n")
                else:
                    print(f"❌ Query error: {result['error']}\n")

    except Exception as e:
        print(f"\nError: {str(e)}\n")
