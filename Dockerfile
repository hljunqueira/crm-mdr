FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev && npm install -g tsx

COPY dist ./dist
COPY server ./server
COPY server.ts ./
COPY tsconfig.json ./

EXPOSE 3000

ENV NODE_ENV=production
CMD ["tsx", "server.ts"]
