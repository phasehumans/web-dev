#!/bin/bash

echo "Cleaning up temporary directories..."

if [ -d "infra/minio/data/december-storage" ]; then
    echo "Clearing infra/minio/data/december-storage/*"
    rm -rf infra/minio/data/december-storage/*
else
    echo "Directory infra/minio/data/december-storage not found."
fi

if [ -d "apps/server/.december-imports" ]; then
    echo "Clearing apps/server/.december-imports/*"
    rm -rf apps/server/.december-imports/*
elif [ -d ".december-imports" ]; then
    echo "Clearing .december-imports/*"
    rm -rf .december-imports/*
else
    echo "Directory apps/server/.december-imports not found."
fi

echo "Cleanup completed successfully!"
