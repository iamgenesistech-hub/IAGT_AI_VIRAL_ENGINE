# Use Node.js 20 on lightweight Alpine Linux
FROM node:20-alpine

# Set non-interactive and timezone fallback
ENV NODE_ENV=production
ENV PORT=4175

# Install system dependencies including ffmpeg
RUN apk add --no-cache ffmpeg

# Create app directory
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install root and backend dependencies
RUN npm install --omit=dev && \
    cd backend && npm install --omit=dev

# Copy application source code
COPY . .

# Expose port
EXPOSE 4175

# Start the application from the root using node backend/server.js
CMD ["node", "backend/server.js"]
