#!/usr/bin/env bash
set -e

SERVICE=$1

if [ -z "$SERVICE" ]; then
    echo "Error: No service specified."
    echo "Usage: bun run logs <service>"
    echo "Available services: postgres, minio, redis, all"
    exit 1
fi

echo "Fetching logs for: $SERVICE..."

if [ "$SERVICE" = "postgres" ]; then
    docker compose -f infra/postgres/docker-compose.yml -p december-postgres logs -f
elif [ "$SERVICE" = "minio" ]; then
    docker compose -f infra/minio/docker-compose.yml -p december-minio logs -f
elif [ "$SERVICE" = "redis" ]; then
    docker compose -f infra/redis/docker-compose.yml -p december-redis logs -f
elif [ "$SERVICE" = "all" ]; then
    echo "Tailing all services (Press Ctrl+C to stop)..."
    # Run all logs in parallel and wait for them
    docker compose -f infra/postgres/docker-compose.yml -p december-postgres logs -f &
    P1=$!
    docker compose -f infra/minio/docker-compose.yml -p december-minio logs -f &
    P2=$!
    docker compose -f infra/redis/docker-compose.yml -p december-redis logs -f &
    P3=$!
    
    # Catch Ctrl+C to kill all background processes safely
    trap "kill $P1 $P2 $P3" SIGINT SIGTERM EXIT
    wait
else
    echo "Unknown service: $SERVICE"
    echo "Available services: postgres, minio, redis, all"
    exit 1
fi
