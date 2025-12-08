# Kaspa Explorer Dockerfile
# Builds from https://github.com/lAmeR1/kaspa-explorer

FROM node:18-alpine AS builder

# Install git
RUN apk add --no-cache git

# Clone the repository
WORKDIR /app
RUN git clone https://github.com/lAmeR1/kaspa-explorer.git .

# Install dependencies
RUN npm install

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files to nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 3000 (mapped from nginx 80)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
