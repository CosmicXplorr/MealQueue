FROM node:22-alpine

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --prod --frozen-lockfile
COPY . .

ARG GIT_SHA=local
ENV GIT_SHA=$GIT_SHA PORT=3000
USER node
EXPOSE 3000
CMD ["node", "server.js"]
