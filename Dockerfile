# ---------- Base: shared OS layer ----------
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl ca-certificates
ENV NEXT_TELEMETRY_DISABLED=1

# ---------- Stage 1: install dependencies ----------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---------- Stage 2: build ----------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# prisma generate does not open a DB connection; placeholder satisfies prisma only
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build?sslmode=disable
RUN npx prisma generate

# Values come from compose build.args — single source: .env + compose defaults
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_APP_URL

ENV NEXT_PUBLIC_FIREBASE_API_KEY=${NEXT_PUBLIC_FIREBASE_API_KEY}
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=${NEXT_PUBLIC_FIREBASE_PROJECT_ID}
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}
ENV NEXT_PUBLIC_FIREBASE_APP_ID=${NEXT_PUBLIC_FIREBASE_APP_ID}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}

RUN npm run build

# ---------- Stage 3: migrate (run on VPS with Neon URL) ----------
# Run with: docker compose --profile migrate run --rm db-migrate
# Uses DATABASE_URL from .env or compose environment (your Neon connection string)
FROM base AS migrator
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
CMD ["npx", "prisma", "migrate", "deploy"]

# ---------- Stage 4: production runner ----------
FROM base AS runner
LABEL org.opencontainers.image.title="studyflow"
LABEL org.opencontainers.image.url="e2526-wads-b4cc.csbihub.id"

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs
EXPOSE 3015
ENV NODE_ENV=production
ENV PORT=3015
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]