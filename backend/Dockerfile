FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HOST=0.0.0.0 \
    PORT=8000 \
    TERRATWIN_AI_OUTPUTS_DIR=/app/research/outputs
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
    && useradd --create-home --uid 10001 sciverse
COPY --chown=sciverse:sciverse terratwin ./terratwin
COPY --chown=sciverse:sciverse ai_service ./ai_service
COPY --chown=sciverse:sciverse research ./research
USER sciverse
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
    CMD python -c "import os,urllib.request; urllib.request.urlopen('http://127.0.0.1:'+os.getenv('PORT','8000')+'/api/v1/agent/health', timeout=4)"
CMD ["sh", "-c", "exec python -m uvicorn terratwin.main:app --host \"${HOST:-0.0.0.0}\" --port \"${PORT:-8000}\""]
