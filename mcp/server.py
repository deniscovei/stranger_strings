from fastmcp.server import FastMCP as MCPServer
from fastmcp import tool
import asyncio

# dacă ai integrat LLM-ul AWS
try:
    from aws_llm_agent import ask_bedrock
except ImportError:
    async def ask_bedrock(prompt: str):
        return "LLM integration not available yet."

# inițializează serverul MCP
server = MCPServer("banking-mcp")

@tool
def ask_ai(prompt: str) -> str:
    """Send a question to the AWS Bedrock LLM agent."""
    print(f"[debug] Sending prompt to Bedrock: {prompt}")
    return asyncio.run(ask_bedrock(prompt))

if __name__ == "__main__":
    print("✅ MCP server running on http://localhost:8080")
    print("Available tools:")
    for t in server.tools:
        print(f"  - {t.name}")
    server.run()
from dotenv import load_dotenv
load_dotenv()