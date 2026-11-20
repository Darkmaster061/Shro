FROM node:22-alpine

WORKDIR /app

# نصب ابزارهای لازم برای ساخت better-sqlite3 در صورت نیاز
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

RUN mkdir -p /app/data /app/uploads /app/backups

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npx", "tsx", "server.ts"]
