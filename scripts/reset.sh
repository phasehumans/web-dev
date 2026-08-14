#!/usr/bin/env bash
set -e

echo "Stopping running services..."
bun run docker:stop

echo "Cleaning temporary files and volumes..."
bun run clean

echo "Starting services..."
bun run docker:start

echo "Waiting for database to be ready..."
sleep 3

echo "Clearing database and applying migrations..."
bun run db:clear

echo "Environment reset successfully!"
