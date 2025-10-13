# Use official Python runtime
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements first (for Docker cache)
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set environment variables
ENV PORT=8080
ENV PYTHONUNBUFFERED=1

# Cloud Run will provide GEMINI_API_KEY via --set-env-vars

# Expose port
EXPOSE 8080

# Run gunicorn (production WSGI server)
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 300 app:app
