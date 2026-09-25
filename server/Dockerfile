# 后端：Node.js 20 运行接口定义存取与 Mock 端点服务
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

EXPOSE 3000
ENV PORT=3000
ENV DATA_FILE=/data/store.json

CMD ["node", "src/index.js"]
