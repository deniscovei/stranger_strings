# Hackathon

## Echipa Stranger Strings

Baldovin Razvan-Mihai-Marian

Covei Denis

Margheanu Cristina

Oprea Marina

Stefanescu Anastasia
#  how to run llm
-- First you run docker  :
docker run -p 8080:8080 mcp-server

In an other terminal run this: 
python -c "import asyncio; from aws_llm_agent import ask_bedrock; print(asyncio.run(ask_bedrock('Summarize recent customer transactions.')))"