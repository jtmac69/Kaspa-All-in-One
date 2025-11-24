# Simply Kaspa Indexer - Use official pre-built image
# Official images: https://hub.docker.com/r/supertypo/simply-kaspa-indexer

ARG SIMPLY_KASPA_VERSION=latest

# Use the official pre-built image
FROM supertypo/simply-kaspa-indexer:latest

# Copy wait-for-db script (must be executable before copying)
COPY --chmod=755 wait-for-db.sh /app/

# Override the entrypoint to run our wait script first
# The official image has its own entrypoint, so we need to override it
WORKDIR /app
ENTRYPOINT []
CMD ["sh", "-c", "/app/wait-for-db.sh && /usr/local/bin/simply-kaspa-indexer"]