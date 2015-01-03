////////////////////////////////////////////////////////////
// Initializing sockets
////////////////////////////////////////////////////////////

var socket = io('10.8.20.245:3000');

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

var constraints = {video: true, audio: false};
var dataChannelOptions ={
  ordered: false,
  maxRetransmitTime: 3000
};
var dataChannel = {};
// var constraints = {video: true, audio: true};
var myID;
var otherIDs = [];
var otherIDsWithIce = [];

var localVideo = $('#localVideo').get(0);
var myDescriptionObj;
var optionalRtpDataChannels = {
    optional: [{
        RtpDataChannels: true
    }]
};
var sdpConstraints = {
   mandatory: {
     'OfferToReceiveAudio': false,
     'OfferToReceiveVideo': false
   }
 };

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

// Listen for remote client and set remote description
socket.on('offer', function(descriptionObj) {
  var callerID = descriptionObj.from;
  myDescriptionObj = descriptionObj;

  // Check to make sure offer is for this client
  if (myID === descriptionObj.to) {

    console.log('received offer from', callerID);
    createPeerConnection(callerID);

    console.log('Offer received', descriptionObj);
    localPeerConnection[callerID].setRemoteDescription(new RTCSessionDescription(descriptionObj.description));

    localPeerConnection[callerID].createAnswer(function(description) {
      createDescription(description, callerID, 'answer');
    }, handleError);
  }
});

// socket.on('tempOffer', function(descriptionObj) {

//   if (descriptionObj.to === myID) {
//     var callerID = descriptionObj.from;
//     console.log('tempOffer received', descriptionObj);
//     localPeerConnection[callerID].addStream(localStream);
//     localPeerConnection[callerID].setRemoteDescription(new RTCSessionDescription(descriptionObj.description));
//     myDescriptionObj.to = callerID;
//     socket.emit('tempAnswer', myDescriptionObj);
//   }
// });

// socket.on('tempAnswer', function(descriptionObj) {
//   console.log('tempAnswer');
//   if (descriptionObj.to === myID) {
//     var callerID = descriptionObj.from;
//     console.log('tempAnswer received', descriptionObj);
//     localPeerConnection[callerID].setRemoteDescription(new RTCSessionDescription(descriptionObj.description));
//   }
// });

// Set remote description from remote peer
socket.on('answer', function(descriptionObj) {
  // Check if message is for this client
  if (descriptionObj.to === myID) {
    var callerID = descriptionObj.from;
    console.log('answer from', descriptionObj);
    console.log('setting remote description', descriptionObj);
    localPeerConnection[callerID].setRemoteDescription(new RTCSessionDescription(descriptionObj.description));
  }
});

// Set ice candidate from remote peer
socket.on('candidate', function(candidateObj) {
  var callerID = candidateObj.from;

  // Check if message is for this client
  if (myID === candidateObj.to) {

    console.log('receiving candidate info from', callerID);
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

function start() {

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

function call(callerID) {
  console.log('starting call', callerID, localPeerConnection);
  createPeerConnection(callerID);
  localPeerConnection[callerID].addStream(localStream);
  console.log('added stream', localPeerConnection[callerID].addStream);

  localPeerConnection[callerID].createOffer(function(description) {
      createDescription(description, callerID, 'offer');
    }, handleError);

}

var count = 0;

function createPeerConnection(callerID) {
  console.log('creating peer connection with', callerID);
  localPeerConnection[callerID] = new RTCPeerConnection(serverInfo, optionalRtpDataChannels);
  dataChannel[callerID] = localPeerConnection[callerID].createDataChannel('RTCDataChannel', {reliable: false});

  dataChannel[callerID].onerror = function(error) {
    console.log('Data Channel Error', error);
  }

  dataChannel[callerID].onmessage = function(event) {
    console.log('Got Data Channel Message', event.data);
  }

  dataChannel[callerID].onopen = function(event) {
    dataChannel[callerID].send('Connected with other Peer');
  }

  dataChannel[callerID].onclose = function(event) {
    console.log('Data Channel is closed');
  }

  localPeerConnection[callerID].onicecandidate = function (event) {
    handleIceCandidate(event.candidate, callerID);
  };

  // localPeerConnection[callerID].onnegotiationneeded = negotiationneeded;
  localPeerConnection[callerID].onaddstream = function gotRemoteStream(event){
    console.log('firing remote stream');
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
  console.log('creating', offerOrAnswer);
    console.log('setting local description');
  localPeerConnection[callerID].setLocalDescription(description);
  var descriptionObj = {
    description: description,
    from: myID,
    to: callerID
  };

  myDescriptionObj = descriptionObj;
  socket.emit(offerOrAnswer, descriptionObj);
}

function handleIceCandidate(candidate, callerID) {

  console.log('sending ice candidate info to ', callerID);
  if (candidate) {
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

