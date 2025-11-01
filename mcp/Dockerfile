# Dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# (Optional) system deps for some wheels
RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Your code
COPY . .

# Default command; args can be appended at `docker run`
CMD ["python", "openai_client.py"]
