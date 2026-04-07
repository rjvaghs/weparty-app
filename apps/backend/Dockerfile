FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY apps/backend/package*.json apps/backend/
RUN npm install

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY apps/backend ./apps/backend
EXPOSE 4000
CMD ["node", "apps/backend/src/server.js"]
