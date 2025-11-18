'use strict';

const fs = require('filesystem');
const express = require('express');
const https = require('https');
const url = require('url');

const PORT = process.env.PORT || 3000;
const app = express()
  .get('/', (req, res) => res.sendFile('controller.html', { root: __dirname }))
  .get('/app', (req, res) => res.sendFile('application.html', { root: __dirname }));

var privateKey  = fs.readFileSync('sslcert/server.key', 'utf8');
var certificate = fs.readFileSync('sslcert/server.crt', 'utf8');
var credentials = {key: privateKey, cert: certificate};
var httpsServer = https.createServer(credentials, app);

httpsServer.listen(PORT, () => console.log(`Listening on ${PORT}`));


////////////////////////////////////////////////////////////////////


const WebSocket = require("ws");
const wss = new WebSocket.Server({ server: httpsServer });

var sockets = {"display": null, "controller": null}

wss.on("connection", (ws, req) => {
  console.log("Client connected", req.url);
  const parameters = url.parse(req.url, true);

  // validate request
  if (!("clientType" in parameters.query)) {
    ws.close(1003, "no client type"); return;
  }
  var client_type = parameters.query.clientType;
  if (!(client_type in sockets)) {
    ws.close(1003, "invalid client type"); return;
  }
  if (sockets[client_type] != null) {
    ws.close(1003, "socket already exists"); return;
  }

  // relay data when both sockets are connected
  sockets[client_type] = ws;
  if (sockets['display'] != null && sockets['controller'] != null) {
    sockets['controller'].onmessage = (event) => {
        sockets['display'].send(event.data);
    };
  }

  // remove reference to socket when closed
  ws.on("close", () => {
    console.log("Client disconnected", req.url);
    sockets[client_type] = null;
  });
});
