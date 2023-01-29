FROM node:latest

ENV NODE_OPTIONS=--openssl-legacy-provider

RUN mkdir /app
WORKDIR /app
COPY ./ /app

RUN npm install

ENV PATH /app/node_modules/.bin:$PATH

CMD ["webpack-dev-server", "--host", "0.0.0.0", "--progress", "--colors", "--open"]
