FROM node:latest

RUN mkdir /app

WORKDIR /app

RUN npm install -g nodemon

COPY package.json /app

RUN npm install

COPY . /app

COPY ../instances /app

EXPOSE 3000

CMD ["npm", "start"]
