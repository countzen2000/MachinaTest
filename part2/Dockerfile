# Build stage
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
COPY data ./data
RUN npm run build

# Runtime
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/data ./data
EXPOSE 3000
CMD ["node", "dist/server.js"]
