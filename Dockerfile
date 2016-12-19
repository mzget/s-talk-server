
FROM node:6.9.2
MAINTAINER nattapon.r <nattapon.r@live.com>
LABEL Name=bol-smelink-chat Version=0.0.1 
COPY package.json /tmp/package.json
RUN cd /tmp && npm install
RUN mkdir -p /usr/src/app && mv /tmp/node_modules /usr/src
WORKDIR /usr/src/app
COPY . /usr/src/app
EXPOSE 3010 3015 3050 3051 3052 3053 3054
CMD npm start
