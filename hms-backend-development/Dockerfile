# Use Node.js 22.21.1
FROM node:22.21.1-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY package-lock.json* ./
COPY prisma ./prisma/

# Install ALL dependencies (including dev dependencies for tsx)
RUN npm ci

# Generate Prisma Client
ENV DATABASE_URL="postgresql://dummy:dummy@dummy:5432/dummy"
RUN npx prisma generate

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3001

# Start in dev mode with tsx (TypeScript execution)
CMD ["npm", "run", "dev"]
