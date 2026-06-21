FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3001
ENV PORT=3001
ENV AI_SERVICE_URL=http://ai:5000/api/evaluate-safety
CMD ["node", "server.js"]
