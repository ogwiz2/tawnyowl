var express = require('express');
var app = express();
var server = require('http').Server(app);
var querystring = require('querystring');
var io = require('socket.io')(server);
var path = require('path');

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
    var numberOfPeopleInRoom = countClients(io.sockets.adapter.rooms[room]);
    clientToRoom[IDPacket.myID] = room;
    console.log('clients joined', clientsInRoom[room]);
    socket.emit('joined', IDPacket);

    clientsInRoom[room].push(IDPacket.myID);
  });

  socket.on('ready', function(clientNumber) {
    var room = socket.rooms[1];
    console.log('sending ready');
    socket.broadcast.to(room).emit('ready', clientNumber);
  });

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
    var index = clientsInRoom[room].indexOf(myID);
    socket.broadcast.emit('left', myID);
    clientsInRoom[room].splice(index, 1);
  });

});

app.get('/socket.io/socket.io.js', function(req, res) {
  res.sendFile(__dirname + '/socket.io/socket.io.js');
});

app.get('/client/css/style.css', function(req, res) {
  res.sendFile(__dirname + '/client/css/style.css');
});

app.get('/client/js/adapter.js', function(req, res) {
  res.sendFile(__dirname + '/client/js/adapter.js');
});

app.get('/client/js/main.js', function(req, res) {
  res.sendFile(__dirname + '/client/js/main.js');
});

app.get('/*', function(req, res) {
  res.sendFile(__dirname + '/client/index.html');
});

// app.get('/*', function(req, res){
//     res.sendfile('index.html', {root: __dirname + '/client' });
// });

server.listen(process.env.PORT || 3000);

function countClients(room) {
  var count = 0;
  for (var key in room) {
    count++;
  }

  return count;
}