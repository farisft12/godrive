# GoDrive Frontend - React (production build served by nginx)
# Build stage: create production build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build for production (Vite: npm run build, or CRA: npm run build)
RUN npm run build

# Production stage: serve static files with nginx
FROM nginx:alpine

# Copy built assets (Vite uses dist/, Create React App uses build/)
COPY --from=builder /app/dist /usr/share/nginx/html
# If your React app uses build/ instead of dist/, use:
# COPY --from=builder /app/build /usr/share/nginx/html

# SPA fallback: all routes serve index.html
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { try_files $uri $uri/ /index.html; } \
    }' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
