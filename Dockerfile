# Dockerfile for compiling Clotient desktop app on Linux without local Rust/NodeJS toolchains
FROM ubuntu:22.04

# Prevent interactive configuration prompts
ENV DEBIAN_FRONTEND=noninteractive

# Update system and install base dependencies, Tauri dependencies, Node.js and Rustup
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    build-essential \
    libssl-dev \
    libgtk-3-dev \
    libsoup2.4-dev \
    webkit2gtk-4.0 \
    libjavascriptcoregtk-4.0-dev \
    pkg-config \
    git \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

# Add Cargo binaries to the PATH
ENV PATH="/root/.cargo/bin:${PATH}"

# Set working directory inside container
WORKDIR /app

# Run installation and trigger compile build output to host mount path
CMD npm install && npm run tauri build
