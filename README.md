## S-talk-server 

A simple chat room experiment using pomelo framework and html5.
The chat server currently runs on nodejs v0.8, and should run fine on the latest stable as well.It requires the following npm libraries:
- pomelo
- crc

[![CircleCI](https://circleci.com/gh/mzget/s-talk-server.svg?style=svg)](https://circleci.com/gh/mzget/s-talk-server)

## Viewing

## Configuration

 * The server setting (server number, host and port, etc.) can be configured in 'game-server/config/servers.json' and 'game-server/config/master.json' files.
 * Other settings (log4js etc.) also can be configured in 'game-server/config' folder.

## Deployment
Enter chatofpomelo/game-server, and run 'pomelo start' or 'node app.js' in order to start the game server.
Enter chatofpomelo/web-server, and run 'node app.js' in order to start the web server, and access '3001' port (which can be changed in 'app_express.js') to load game.

## Monitoring

Pomelo framework provides monitoring tool: AdminConsole. After game is loaded, you can access '7001' port and monitor the game information(operating-system, process, userInfo, sceneInfo, etc.).

## Client

**Java-Android client**
https://github.com/planktons/stalk-droid-client/tree/master/stalk

**Javascript client**
https://github.com/planktons/stalk-javascript-client

**C-sharp-unity3d client**
https://github.com/planktons/stalk-c-sharp-unity3d-client