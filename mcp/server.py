from fastmcp import FastMCP

# Creează aplicația MCP
app = FastMCP("demo-server")

# Definește o funcție pe care AI-ul o poate apela
@app.tool()
def get_balance(account_number: str) -> dict:
    """Returnează un sold fictiv pentru un cont bancar."""
    return {
        "account_number": account_number,
        "balance": 1234.56,
        "currency": "USD"
    }

# Pornește serverul MCP cu transport HTTP
if __name__ == "__main__":
    app.run(transport="http", host="0.0.0.0", port=8080)
