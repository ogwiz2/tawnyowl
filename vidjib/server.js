var express = require('express');
var app = express();
var server = require('http').Server(app);
var path = require('path');
var io = require('socket.io')(server);

io.on('connection', function(socket){

  // socket.on('disconnect', function(){
  //   console.log('user disconnected');
  // });

  // socket.on('message', function(msg){
  //   console.log('msg is: ', msg);
  //   io.emit('msgtodisplay', msg);
  // });
  //

  socket.on('offer', function(description) {
    console.log('offer', description);
    socket.broadcast.emit('offer', description); //change to broadcast
  });

  socket.on('answer', function(description) {
    console.log('answer', description);
    socket.broadcast.emit('answer', description);
  });

  socket.on('candidate', function(candidate) {
    console.log('candidate', candidate);
    socket.broadcast.emit('candidate', candidate);
  });

})

app.use(express.static(path.join(__dirname, ".")));

server.listen(process.env.PORT || 3000);