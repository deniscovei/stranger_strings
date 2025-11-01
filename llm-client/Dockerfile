# Use official Python runtime as base image
FROM python:3.12

# Set working directory in container
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY aws_client.py .

# Copy .env file if it exists (optional, can be mounted at runtime)
COPY .env* ./

# Set environment variables (can be overridden at runtime)
ENV PYTHONUNBUFFERED=1

# Run the Python script
CMD ["python", "aws_client.py"]
