# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (cached if package.json hasn't changed)
COPY package*.json tsconfig.json ./
RUN npm install

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy source files
COPY src ./src

# Build TypeScript -> JavaScript
RUN npm run build

# Stage 2: Run
FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY tel_api.session ./
COPY package*.json ./

# Set environment variable for production
ENV NODE_ENV=production
ENV PORT=4000

# Expose API port
EXPOSE 4000

# Apply Prisma migrations then start app
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
# CMD ["node", "dist/server.js"]
