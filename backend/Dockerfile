# Build from the repository root (the API needs the shared engine in prototype/js):
#   docker build -f backend/Dockerfile -t mosta3lem-api .
FROM node:22-alpine

WORKDIR /srv/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY prototype/js /srv/prototype/js
COPY backend/src ./src
COPY backend/migrations ./migrations

ENV NODE_ENV=production PORT=4000
EXPOSE 4000
USER node
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:4000/health || exit 1
CMD ["node", "src/index.js"]
