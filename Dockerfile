FROM node:8.9.4
ENV NODE_ENV development
WORKDIR /usr/src/app
COPY ["package.json", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent && mv node_modules ../
COPY . .
EXPOSE 3003 3020 3021
CMD npm start