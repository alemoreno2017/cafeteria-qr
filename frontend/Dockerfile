FROM node:22-alpine

WORKDIR /app

ARG VITE_API_URL=http://127.0.0.1:3333
ARG VITE_SOCKET_URL=http://127.0.0.1:3333
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

COPY package.json package-lock.json* ./
RUN npm install

COPY . ./

RUN npm run build

EXPOSE 4173

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173"]
