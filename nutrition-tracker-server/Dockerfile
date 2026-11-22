# Development image for the Express + Prisma API.
FROM node:24-alpine

# Prisma's migration engine needs OpenSSL on Alpine.
RUN apk add --no-cache openssl

WORKDIR /app

# Install dependencies first so this layer is cached until package*.json changes.
# The lockfile's hash is saved so docker-entrypoint.sh can tell when it changes later.
COPY package.json package-lock.json ./
RUN npm ci && sha256sum package-lock.json | cut -d ' ' -f 1 > node_modules/.package-lock.sha256

COPY . .

EXPOSE 4000

# Reinstalls dependencies on start if package-lock.json changed, then runs CMD.
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]

# Generate the Prisma client, apply pending migrations, then start the API with hot reload.
CMD ["npm", "run", "docker:dev"]
