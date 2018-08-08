FROM node:latest

RUN mkdir /app

WORKDIR /app

RUN npm install -g nodemon

COPY package.json /app

RUN npm install

COPY . /app

CMD ["npm", "start"]
