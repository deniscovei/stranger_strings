# Use official Python runtime as base image
FROM python:3.12

# Set working directory in container
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application code
COPY backend/ ./backend/
COPY models/ ./models/
COPY sql/ ./sql/

# Copy .env file if it exists (optional, can be mounted at runtime)
COPY .env* ./

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=backend/backend_api.py
ENV MODEL_PATH=/app/models/lightgbm_model.pkl

# Default: Run the LLM client (can override in docker-compose)
CMD ["python", "aws_client.py"]
