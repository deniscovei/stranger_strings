# LLM Client - Docker Setup

AWS Bedrock client application containerized with Docker.

## Building the Docker Image

```bash
cd llm-client
docker build -t llm-client .
```

## Running the Container

### Option 1: With environment variables
```bash
docker run --rm \
  -e AWS_BEARER_TOKEN_BEDROCK=your-token-here \
  llm-client
```

### Option 2: With .env file mounted
```bash
docker run --rm \
  -v $(pwd)/.env:/app/.env \
  llm-client
```

### Option 3: Interactive mode
```bash
docker run --rm -it \
  -e AWS_BEARER_TOKEN_BEDROCK=your-token-here \
  llm-client bash
```

## Environment Variables

- `AWS_BEARER_TOKEN_BEDROCK` - Your AWS Bedrock API token (required)

## Docker Compose (Optional)

You can also use Docker Compose for easier management:

```bash
docker-compose up
```

## Building for Production

```bash
docker build -t llm-client:latest .
docker tag llm-client:latest your-registry/llm-client:latest
docker push your-registry/llm-client:latest
```
