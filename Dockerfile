
FROM node:8.9.3
MAINTAINER nattapon.r <nattapon.r@live.com>
LABEL Name=stalk-chitchat Version=0.0.1 
COPY package.json /tmp/package.json
RUN cd /tmp && npm install
RUN mkdir -p /usr/src/app && mv /tmp/node_modules /usr/src
WORKDIR /usr/src/app
COPY . /usr/src/app
EXPOSE 3020 3021
CMD npm start