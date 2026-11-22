# Development image for the Express + Prisma API.
FROM node:24-alpine

# Prisma's migration engine needs OpenSSL on Alpine.
RUN apk add --no-cache openssl

WORKDIR /app

# Install dependencies first so this layer is cached until package*.json changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 4000

# Generate the Prisma client, apply pending migrations, then start the API with hot reload.
CMD ["npm", "run", "docker:dev"]
