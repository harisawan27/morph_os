FROM python:3.11-slim

WORKDIR /app
COPY backend/requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

# vault_manager.py resolves templates as ../frontend/src/vault/templates
# relative to /app, so that path must be /frontend/src/vault/templates inside
# the container. Copy the JSX files in at build time.
RUN mkdir -p /frontend/src/vault/templates
COPY frontend/src/vault/templates/ /frontend/src/vault/templates/

# HuggingFace Spaces expects port 7860
EXPOSE 7860
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}"]
