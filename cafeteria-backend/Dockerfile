FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY src ./src
COPY .env.example ./.env.example
RUN mkdir -p /app/uploads/products

EXPOSE 3333

CMD ["npm", "start"]
