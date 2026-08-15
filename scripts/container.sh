#!/usr/bin/env bash
set -e

ACTION=$1

if [ -z "$ACTION" ]; then
    echo "Error: No action specified."
    echo "Usage: bun run container <start|stop>"
    exit 1
fi

if [ "$ACTION" = "start" ]; then
    echo "Starting containers (Minio, Postgres, Redis)..."
    docker compose -f infra/minio/docker-compose.yml -p december-minio up -d
    docker compose -f infra/postgres/docker-compose.yml -p december-postgres up -d
    docker compose -f infra/redis/docker-compose.yml -p december-redis up -d
    echo "Containers started successfully!"
elif [ "$ACTION" = "stop" ]; then
    echo "Stopping containers (Minio, Postgres, Redis)..."
    docker compose -f infra/redis/docker-compose.yml -p december-redis down
    docker compose -f infra/postgres/docker-compose.yml -p december-postgres down
    docker compose -f infra/minio/docker-compose.yml -p december-minio down
    echo "Containers stopped successfully!"
else
    echo "Unknown action: $ACTION"
    echo "Usage: bun run container <start|stop>"
    exit 1
fi
