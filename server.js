var express = require('express'),
    app = express(),
    https = require('http'),
    server = https.createServer(app),
    io = require('socket.io').listen(server),
    port = 3000,
    ipAddress = '0.0.0.0';


server.listen(port,ipAddress,function () {
    console.log('rtc started in on port : ' + port);
});
app.get('/', function (req, res) {
    res.sendfile(__dirname + '/public/index.html');
});

io.sockets.on('connection', function (socket) {
    console.log("A new client has connected.");
    socket.on('message', function (data) {
        socket.broadcast.emit('message', data);
    });
});