# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY app/frontend/package*.json ./frontend/
COPY app/backend/package*.json ./backend/

# Install dependencies
RUN cd frontend && npm ci && cd ..
RUN cd backend && npm ci && cd ..

# Copy source code
COPY app/frontend ./frontend/
COPY app/backend ./backend/

# Build frontend
RUN cd frontend && npm run build && cd ..

# Production stage
FROM node:18-alpine

WORKDIR /app/backend

# Copy built frontend to backend
COPY --from=builder /app/frontend/dist ../frontend/dist

# Copy backend dependencies and source
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/server.js ./server.js
COPY --from=builder /app/backend/package*.json ./

# Create database directory
RUN mkdir -p /app/backend && chmod 755 /app/backend

EXPOSE 8080

CMD ["node", "server.js"]
