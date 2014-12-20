////////////////////////////////////////////////////////////
// Initializing sockets
////////////////////////////////////////////////////////////

var socket = io();

$('form').submit(function(){
  socket.emit('message', $('#msg').val());
  $('#msg').val('');
  return false;
})
socket.on('msgtodisplay', function(msg){
  $('ul').append($('<li>').text(msg))
})

////////////////////////////////////////////////////////////
// Helper functions
////////////////////////////////////////////////////////////

navigator.getUserMedia = navigator.getUserMedia ||
  navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

////////////////////////////////////////////////////////////
// Setup RTC peer connection
////////////////////////////////////////////////////////////

var localStream;
var localPeerConnection;
var constraints;

var localVideo = $('#localVideo').get(0);
var remoteVideo = $('#remoteVideo').get(0);

//////////////////////////////
// Get local video stream
//////////////////////////////

// performance fn to be added (trace)

// Start the stream as soon as the page loads (and camera allowed)
start();

function errorCallback (error) {
  console.log("navigator.getUserMedia error: " + error);
}

function gotStreamSuccess (stream) {
  console.log("got local stream");
  console.log(stream);
  localVideo.src = URL.createObjectURL(stream);
  localStream = stream;
  call();
}

function start () {
  constraints = {video: true, audio: true};
  console.log('requesting local stream');
  var room = window.location.pathname;

  socket.emit('join', room);
  navigator.getUserMedia(constraints, gotStreamSuccess, errorCallback);
}

function call () {
  console.log('starting call');

  //check presence of local video and audio
  if (localStream.getVideoTracks().length > 0) {
    console.log('Using video device: ' + localStream.getVideoTracks()[0].label);
  }
  if (localStream.getAudioTracks().length > 0) {
    console.log('Using audio device: ' + localStream.getAudioTracks()[0].label);
  }

  //caller sets their peer connection
  createPeerConnection();

  localPeerConnection.addStream(localStream);
  console.log("Added localStream to localPeerConnection");
  localPeerConnection.createOffer(gotLocalDescriptionBeforeOffer,handleError);
}

function createPeerConnection() {
  var servers = null;

  localPeerConnection = new RTCPeerConnection(servers);
  console.log("Created local peer connection object localPeerConnection");
  localPeerConnection.onicecandidate = handleIceCandidate;
  localPeerConnection.onaddstream = gotRemoteStream;
  localPeerConnection.onremovestream = removeRemoteStream;
}

function gotLocalDescriptionBeforeOffer(description){
  console.log("Offer from localPeerConnection: \n" + description.sdp);
  localPeerConnection.setLocalDescription(description);

  //send offer to other
  console.log('making offer');
  socket.emit('offer', description);
}

function gotLocalDescriptionBeforeAnswer(description){
  localPeerConnection.setLocalDescription(description);
  console.log("Answer from localPeerConnection: \n" + description.sdp);

  //send offer to other
  console.log('answering call');
  socket.emit('answer', description);
}

//other client listening for offer and setting their remote description
socket.on('offer', function(description) {
  console.log('receiving offer');
  createPeerConnection();
  localPeerConnection.addStream(localStream);
  localPeerConnection.setRemoteDescription(new RTCSessionDescription(description));
  localPeerConnection.createAnswer(gotLocalDescriptionBeforeAnswer,handleError);
});

socket.on('answer', function(description) {
  console.log('receiving answer');
  localPeerConnection.setRemoteDescription(new RTCSessionDescription(description));
});

socket.on('candidate', function(candidate) {
  console.log('receiving candidate info');
  var candidate = new RTCIceCandidate({
    sdpMLineIndex: candidate.label,
    candidate: candidate.candidate
  });

  localPeerConnection.addIceCandidate(candidate);
});

function hangup() {
  console.log("Ending call");
  localPeerConnection.close();
  localPeerConnection = null;
}

function gotRemoteStream(event){
  console.log('remote stream');
  console.log(event.stream);
  remoteVideo.src = URL.createObjectURL(event.stream);
  console.log("Received remote stream");
}

function removeRemoteStream(event) {
  console.log('closed');
  remoteVideo.src = "";
};

function handleIceCandidate(event) {
  if (event.candidate) {
    var candidate = {
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    };

    console.log('sending candidate info');
    socket.emit('candidate', candidate);
  }

};

function handleError(){}

start();

