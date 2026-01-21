FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY src ./src

RUN mkdir -p sessions

EXPOSE 3214

ENV NODE_ENV=production
ENV PORT=3214

CMD ["node", "src/index.js"]
