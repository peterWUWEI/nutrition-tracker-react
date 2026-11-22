# Development image for the React + Vite client.
FROM node:24-alpine

WORKDIR /app

# Install dependencies first so this layer is cached until package*.json changes.
# The lockfile's hash is saved so docker-entrypoint.sh can tell when it changes later.
COPY package.json package-lock.json ./
RUN npm ci && sha256sum package-lock.json | cut -d ' ' -f 1 > node_modules/.package-lock.sha256

COPY . .

EXPOSE 5173

# Reinstalls dependencies on start if package-lock.json changed, then runs CMD.
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]

# --host makes the Vite dev server reachable from outside the container.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
