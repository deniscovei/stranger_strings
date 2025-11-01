docker compose build
docker compose up -d postgres backend-api
docker compose run --rm llm-client