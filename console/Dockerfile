# The staff console. Build from the repository root (it uses the shared engine in prototype/js);
# the API address is fixed when the console is built:
#   docker build -f console/Dockerfile --build-arg NEXT_PUBLIC_API_URL=https://api.example.eg -t mosta3lem-console .
FROM node:22-alpine AS build
WORKDIR /srv
COPY prototype/js ./prototype/js
COPY console/package.json console/package-lock.json ./console/
RUN cd console && npm ci && npm cache clean --force
COPY console ./console
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_TELEMETRY_DISABLED=1
RUN cd console && npx next build

FROM node:22-alpine
WORKDIR /srv
COPY --from=build /srv/prototype ./prototype
COPY --from=build /srv/console ./console
WORKDIR /srv/console
ENV NODE_ENV=production PORT=3600 NEXT_TELEMETRY_DISABLED=1
EXPOSE 3600
USER node
CMD ["npx", "next", "start", "-p", "3600"]
