#!/usr/bin/env bash
set -e

echo "Cleaning up temporary directories and volumes..."

# Clean legacy minio bind-mount directory if present on host
if [ -d "infra/minio/data" ]; then
    echo "Clearing legacy infra/minio/data..."
    rm -rf infra/minio/data 2>/dev/null || docker run --rm -v "$(pwd)/infra/minio/data:/data" alpine sh -c "rm -rf /data/* /data/.* 2>/dev/null || true" 2>/dev/null || true
    rm -rf infra/minio/data 2>/dev/null || true
fi

# Clean MinIO volume if docker is available
if command -v docker >/dev/null 2>&1; then
    if docker ps --format '{{.Names}}' | grep -q "^december-minio$"; then
        echo "Clearing MinIO data inside running container..."
        docker compose -f infra/minio/docker-compose.yml -p december-minio exec -T minio sh -c "rm -rf /data/* /data/.* 2>/dev/null || true" 2>/dev/null || true
    elif docker volume inspect december-minio_minio_data >/dev/null 2>&1; then
        echo "Removing MinIO docker volume (december-minio_minio_data)..."
        docker volume rm december-minio_minio_data 2>/dev/null || true
    fi
fi



# Clean session log files and test artifacts
echo "Clearing .december/logs and test log directories..."
rm -rf .december/logs packages/*/.december/logs apps/*/.december/logs 2>/dev/null || true

echo "Cleanup completed successfully!"
