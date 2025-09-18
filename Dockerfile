# ----- base -----
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ----- dev (hot reload) -----
FROM base AS dev
ENV NODE_ENV=development
COPY package*.json ./
RUN npm install
COPY . .
# Next.js file watching can be flaky on Windows; polling helps:
ENV WATCHPACK_POLLING=true
CMD ["npm", "run", "dev"]

# ----- builder (prod compile) -----
FROM base AS builder
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ----- runner (tiny prod image) -----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# minimal files for standalone
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
