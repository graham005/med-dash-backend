# Using Node.js 22 Alpine as base image
FROM node:22-alpine

#Install pnpm globally
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Create applogs directory for logging
RUN mkdir -p /app/applogs


# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml  ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy all source code
COPY . .

EXPOSE 9000

# Start application (pnpm run start:dev)
CMD ["pnpm", "run", "start:dev"]