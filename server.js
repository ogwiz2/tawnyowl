var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var path = require('path');



// SERVER
var accountSid = 'ACbd542df5518c1519e19547439867662a';
var authToken = "c18fb66a749846755ee274324f3ce7fe";
var client = require('twilio')(accountSid, authToken);
var serverInfo;

io.set('origins', '*:*');

client.tokens.create({}, function(err, token) {
    serverInfo = token;
});

// socket.client.conn.id
  var clientsInRoom = {};
  var clientToRoom = {};
io.on('connection', function(socket){

  socket.on('join', function(room) {
    if (!clientsInRoom[room]) {
      clientsInRoom[room] = [];
    }

    socket.join(room);
    var IDPacket = {};
    IDPacket.myID = socket.client.conn.id;
    IDPacket.otherIDs = clientsInRoom[room];
    clientToRoom[IDPacket.myID] = room;
    IDPacket.serverInfo = serverInfo;
    console.log('clients joined', clientsInRoom[room]);
    socket.emit('joined', IDPacket);

    clientsInRoom[room].push(IDPacket.myID);
  });

  socket.emit('PORT', process.env.PORT);

  socket.on('offer', function(descriptionObj) {
    var room = socket.rooms[1];

    // console.log('offer', room);
    socket.broadcast.to(room).emit('offer', descriptionObj); //change to broadcast
  });

  socket.on('answer', function(description) {
    var room = socket.rooms[1];
    // console.log('answer', room);
    socket.broadcast.to(room).emit('answer', description);
  });

  socket.on('candidate', function(candidate) {
    var room = socket.rooms[1];
    // console.log('candidate', room);
    socket.broadcast.to(room).emit('candidate', candidate);
  });

  socket.on('disconnect', function() {
    var myID = socket.client.conn.id;
    var room = clientToRoom[myID];
    // var index = clientsInRoom[room].indexOf(myID);
    socket.broadcast.emit('left', myID);
    // clientsInRoom[room].splice(index, 1);
  });

});

app.get('/socket.io/socket.io.js', function(req, res) {
  res.sendFile(__dirname + '/socket.io/socket.io.js');
});

app.get('/lib/socket.io-client/socket.io.js', function(req, res) {
  res.sendFile(__dirname + '/client/lib/socket.io-client/socket.io.js');
});

app.get('/css/style.css', function(req, res) {
  res.sendFile(__dirname + '/client/css/style.css');
});

app.get('/js/adapter.js', function(req, res) {
  res.sendFile(__dirname + '/client/js/adapter.js');
});

app.get('/js/main.js', function(req, res) {
  res.sendFile(__dirname + '/client/js/main.js');
});

app.get('/*', function(req, res) {
  res.sendFile(__dirname + '/client/index.html');
});

server.listen(process.env.PORT || 3000);