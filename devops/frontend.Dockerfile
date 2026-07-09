# Stage 1: Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json tailwind.config.js postcss.config.js ./
RUN npm ci

COPY src ./src
# Deshabilitar telemetría de Next.js
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Stage 2: Production Stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED 1

COPY package*.json ./
RUN npm ci --only=production

# Copiar artefactos compilados desde el builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Puerto por defecto de Next.js
EXPOSE 3000

CMD ["npx", "next", "start", "-p", "3000"]
