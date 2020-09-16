"use strict";

// Clean-up function:
// collect garbage before unloading browser's window
window.onbeforeunload = function (e) {
  hangup();
};



// HTML5 <video> elements
var localVideo = document.querySelector("#localVideo");
var remoteVideo = document.querySelector("#remoteVideo");



// WebRTC data structures
// Streams
var localStream;
var remoteStream;
// Peer Connection

var peerConfig = null;

/////////////////////////////////////////////

// Let's get started: prompt user for input (room name)
var room = prompt("Enter room name:");

var socket = io.connect();


// Send 'Create or join' message to singnalling server
if (room !== "") {
  console.log("Entrando na sala", room);
  socket.emit("join", room);
}


// Call getUserMedia()
// navigator.getUserMedia(constraints, handleUserMedia, handleUserMediaError);
navigator.mediaDevices.getUserMedia({ video: true, audio: true})
  .then(mediaStream =>{
    handleUserMedia(mediaStream);
    startApp(mediaStream);
    console.log("Pegando userMedia com constraints:", { video: true,audio: true});
  })
  .catch(e => console.log('Error: ',e));



// From this point on, execution proceeds based on asynchronous events...

/////////////////////////////////////////////

// getUserMedia() handlers...
/////////////////////////////////////////////
function handleUserMedia(stream) {
  localStream = stream;
  localVideo.muted = true;
  attachMediaStream(localVideo, stream);
  console.log("Adicionando stream local.");
}

/////////////////////////////////////////////

// Server-mediated message exchanging...
/////////////////////////////////////////////



////////////////////////////////////////////////

// Peer Connection management...
const startApp = function(mediaStream){
  const createPeerConnection = function(peerId) {
    try {
      const pc = new RTCPeerConnection();

      pc.onicecandidate = evt => {
            console.log("iceCandidate event: ", evt);
        if (evt.candidate) {
          console.log('Emitindo candidato ice');
          socket.emit('peerIceCandidate', {to: peerId, candidate: evt.candidate})

        } else {
          console.log("End of candidates.");
        }
      };
      pc.ontrack = evt => {
        console.log('stream recebida do remotePeer')
        remoteStream = evt.streams[0];
        attachMediaStream(remoteVideo,remoteStream);
        console.log('adicionando stream remota');
      }
      for(const track of mediaStream.getTracks()){
        pc.addTrack(track);
      }
      return pc;

    } catch (e) {
      console.log("Failed to create PeerConnection, exception: " + e.message);
      alert("Cannot create RTCPeerConnection object.");
      return;
    }
  }

// 1. Server-->Client...
/////////////////////////////////////////////



  socket.on('peerConnected', remotePeer => {
    console.log(`Usuário ${remotePeer.id} entrou na sala`);
    const pc = createPeerConnection(remotePeer.id);
    console.log('Criando offer');
    pc.createOffer()
      .then(sdp => {
        console.log('Offer criada');
        pc.setLocalDescription(sdp)
        console.log('LocalDescription setada');
      })
      .then(() => socket.emit('peerOffer',{to:remotePeer.id, sdp: pc.localDescription}))
      .catch(e => console.log('Erro: ', e))
  });
  
  socket.on('peerOffer', offer => {
    console.log('Offer recebida de', offer.from);
    const pc = createPeerConnection(offer.from);
    pc.setRemoteDescription(new RTCSessionDescription(offer.sdp))
      .then(() => pc.createAnswer())
      .then(sdp => pc.setLocalDescription(sdp))
      .then(() => socket.emit('peerAnswer',{to: offer.from, sdp: pc.localDescription}))
      .catch(e => console.log('Error: ', e));
  });
  
  socket.on('peerAnswer', Answer => {
    console.log('resposta de ', Answer.from);
    console.log('Achou o peer');
    pc.setRemoteDescription(new RTCSessionDescription(Answer.sdp))
      .catch(e => console.log('Error: ', e));
  });
  
  socket.on('peerIceCandidate', ice => {
    console.log('recebendo ice');
    console.log('Recebido iceCandidate de:', ice.from)
    pc.addIceCandidates(new RTCIceCandidate(ice.candidate))
      .catch(e => console.log('Error: ', e))
  })
}






///////////////////////////////////////////

