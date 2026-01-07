FROM node:latest

# Create app directory
WORKDIR /node

# Install app dependencies
COPY package*.json ./

RUN npm install

COPY tsconfig.json /node/tsconfig.json
COPY ./src /node/src

RUN npm run build
RUN npm install -g .

COPY ./entrypoint.sh /node/entrypoint.sh
COPY ./docs/wad /node/wad
COPY ./resgen /usr/local/bin/resgen

USER 1001:1001
WORKDIR /app

ENTRYPOINT ["/node/entrypoint.sh"]