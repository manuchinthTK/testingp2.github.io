FROM node:18-bullseye

# Install Java and dependencies
RUN apt-get update && \
    apt-get install -y openjdk-17-jdk && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create server directory
RUN mkdir -p /workspace/minecraft-server

WORKDIR /workspace
