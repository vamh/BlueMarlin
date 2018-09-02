'use strict';

const http = require('http');
const WebSocketServer = require("ws").Server;

const httpServer = http.createServer(function (req, res) {
    res.setHeader('Access-Control-Allow-Headers', '*');
});

httpServer.listen(8889, function () {
    console.log('Server is listening at port: 8889');
});

const wss = new WebSocketServer({ server: httpServer });

var clients = [];

exports.broadcastJSON = json => {
    if (clients.length === 0)
        return;

    var string = JSON.stringify(json);

    clients.forEach(ws => {
        ws.send(string);
    });
};

wss.on('connection', ws => {
    ws.on('close', () => {
        var i = clients.indexOf(ws);

        if (i > -1) {
            clients.splice(i, 1);
        }
    });

    ws.on('error', () => console.log('errored'));

    clients.push(ws);
});