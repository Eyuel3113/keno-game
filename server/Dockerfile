FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build
RUN mkdir -p uploads

EXPOSE 5000
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
