FROM mcr.microsoft.com/devcontainers/javascript-node:22

ENV PNPM_HOME=/workspaces/pnpm
RUN corepack enable pnpm

WORKDIR /workspaces/progbot

RUN pnpm fetch