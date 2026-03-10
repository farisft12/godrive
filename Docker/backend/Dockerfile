# GoDrive Backend - Node.js 20
# Exposes port 5000

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application source
COPY . .

# Create storage directories
RUN mkdir -p storage/uploads storage/streams storage/temp

# Backend listens on PORT (default 5000 in compose)
EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "src/server.js"]
