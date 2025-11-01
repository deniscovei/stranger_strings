# Hackathon

## Echipa Stranger Strings

Baldovin Razvan-Mihai-Marian

Covei Denis

Margheanu Cristina

Oprea Marina

Stefanescu Anastasia

## How to run LLM Client

Go to the correct folder: `cd /llm-client` 

Install requirements: `pip install -r requirements.txt`

Create your local `.env` file and complete the correct Bedrock bearer token (from Whatsapp) - `boto3` fetches this token automatically

Run file: `python aws_client.py`

## How to run backend

`docker compose build `

`docker compose up -d postgres backend-api  `

`docker compose run --rm llm-client`
