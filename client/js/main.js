////////////////////////////////////////////////////////////
// Initializing sockets
////////////////////////////////////////////////////////////

// var socket = io('10.8.20.245:3000');
var socket = io();
// var socket = io.connect('http://vidjib.herokuapp.com/socket.io:30589');

////////////////////////////////////////////////////////////
// Helper functions
////////////////////////////////////////////////////////////

navigator.getUserMedia = navigator.getUserMedia ||
  navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

////////////////////////////////////////////////////////////
// Setup RTC peer connection
////////////////////////////////////////////////////////////

// Stores all localPeerConnection
var localStream;
var localPeerConnection = {};
var serverInfo;
var constraints = {video: true, audio: true};
var myID;
var otherIDs = [];

var localVideo = $('#localVideo').get(0);

//////////////////////////////
// Get local video stream
//////////////////////////////

// performance fn to be added (trace)

// Start the stream as soon as the page loads (and camera allowed)
var room = window.location.pathname;
socket.emit('join', room);

//does not call if there is only one person in the room
socket.on('joined', function(IDPacket) {
  myID = IDPacket.myID;
  otherIDs = IDPacket.otherIDs;
  serverInfo = IDPacket.serverInfo;
  console.log('myID', myID);
  start();
});

socket.on('PORT', function(port) {
  console.log('port', port);
});

// Listen for remote client and set remote description
socket.on('offer', function(descriptionObj) {
  var callerID = descriptionObj.from;

  // Check to make sure offer is for this client
  if (myID === descriptionObj.to) {

    console.log('received offer from', callerID);
    createPeerConnection(callerID);
    localPeerConnection[callerID].addStream(localStream);
    localPeerConnection[callerID].setRemoteDescription(new RTCSessionDescription(descriptionObj.description));

    localPeerConnection[callerID].createAnswer(function(description) {
      createDescription(description, callerID, 'answer');
    }, handleError);
  }
});

// Set remote description from remote peer
socket.on('answer', function(descriptionObj) {

  // Check if message is for this client
  if (descriptionObj.to === myID) {
    var callerID = descriptionObj.from;
    localPeerConnection[callerID].setRemoteDescription(new RTCSessionDescription(descriptionObj.description));
  }
});

// Set ice candidate from remote peer
socket.on('candidate', function(candidateObj) {
  var callerID = candidateObj.from;

  // Check if message is for this client
  if (myID === candidateObj.to) {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: candidateObj.label,
      candidate: candidateObj.candidate
    });
    localPeerConnection[callerID].addIceCandidate(candidate);
  }
});

// Remove video stream if remote peer leaves
socket.on('left', function(callerID) {
  console.log('somebody left', callerID);
  $('#' + callerID).remove();
});

function call (callerID) {
  console.log('starting call', callerID);
  createPeerConnection(callerID);
  localPeerConnection[callerID].addStream(localStream);
  localPeerConnection[callerID].createOffer(function(description) {
      createDescription(description, callerID, 'offer');
    }, handleError);
}

function start() {

  // constraints = {video: true};

  //joins unique room
  navigator.getUserMedia(constraints, gotStreamSuccess, errorCallback);
}

function gotStreamSuccess (stream) {
  console.log("got local stream", otherIDs);

  localVideo.src = URL.createObjectURL(stream);
  localStream = stream;
  localID = stream.id;

  //check presence of local video and audio
  if (localStream.getVideoTracks().length > 0) {
    console.log('Using video device: ' + localStream.getVideoTracks()[0].label);
  }
  if (localStream.getAudioTracks().length > 0) {
    console.log('Using audio device: ' + localStream.getAudioTracks()[0].label);
  }

  // Call every client in room
  for (var i = 0; i < otherIDs.length; i++) {
    call(otherIDs[i]);
  }
}

function createPeerConnection(callerID) {
  localPeerConnection[callerID] = new RTCPeerConnection(serverInfo);

  localPeerConnection[callerID].onicecandidate = function (event) {
    handleIceCandidate(event.candidate, callerID);
  };

  // localPeerConnection[callerID].onnegotiationneeded = negotiationneeded;
  localPeerConnection[callerID].onaddstream = function gotRemoteStream(event){
    createRemoteVideo(event.stream, callerID);
  };
  localPeerConnection[callerID].onremovestream = removeRemoteStream;
}

function createRemoteVideo(remoteStream, callerID) {
  var remoteVideo = document.createElement('video');
  remoteVideo.setAttribute('class', 'remoteVideo');
  remoteVideo.id = callerID;
  remoteVideo.src = URL.createObjectURL(remoteStream);
  remoteVideo.autoplay = true;
  document.body.appendChild(remoteVideo);
  console.log("Received remote stream");
}

function createDescription(description, callerID, offerOrAnswer) {
  localPeerConnection[callerID].setLocalDescription(description);
  var descriptionObj = {
    description: description,
    from: myID,
    to: callerID
  };

  socket.emit(offerOrAnswer, descriptionObj);
}

function handleIceCandidate(candidate, callerID) {
  if (event.candidate) {
    var candidateObj = {
      label: candidate.sdpMLineIndex,
      from: myID,
      to: callerID,
      candidate: candidate.candidate
    };

    socket.emit('candidate', candidateObj);
  }
}

function handleError(){}

function removeRemoteStream(event) {
  console.log('CLOSED');
};

function errorCallback (error) {
  console.log("navigator.getUserMedia error: " + error);
}

