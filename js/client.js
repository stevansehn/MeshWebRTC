const peers = new Map();


// HTML5 <video> elements
const localVideo = document.querySelector("#localVideo");
const remoteVideoContainer = document.querySelector("#remoteVideoContainer");
const muteButton = document.getElementById('muteButton');
muteButton.onclick = Mute;

// Streams
let localStream;

const peerConfig = null;

const room = prompt("Enter room name:");
// const room = 'teste';

function handleUserMedia(stream) {
  localStream = stream;
  localVideo.srcObject = localStream;
  localVideo.muted = true;
  localVideo.onloadedmetadata= () => localVideo.play();
  console.log("Adicionando stream local.");
}

function handleRemoteStream(mediaStream, peerId){
    const videoElement = document.createElement('video');
    videoElement.id = peerId;
    videoElement.srcObject = mediaStream;
    videoElement.onloadedmetadata = () => videoElement.play();
    remoteVideoContainer.appendChild(videoElement);
}

function removeRemoteVideo(peerId){
  console.log('kkkkkkkkk');
  remoteVideo = document.getElementById(peerId);
  remoteVideoContainer.removeChild(remoteVideo);
}

function Mute(){
  const enabled = localStream.getAudioTracks()[0].enabled;
  if (enabled) {
    localStream.getAudioTracks()[0].enabled = false;
  } else {
    localStream.getAudioTracks()[0].enabled = true;
  }
}
// Peer Connection management...
const startApp = function(mediaStream){

  const socket = io.connect();

  const createPeerConnection = function(peerId) {
    try {
      const pc = new RTCPeerConnection();

      let remoteStream = null;

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
      
        remoteStream = new MediaStream;
        handleRemoteStream(remoteStream, peerId);
        remoteStream.addTrack(evt.track);
        // console.log('track recebida do remotePeer')
        // remoteStream = evt.streams[0];
        // remoteVideo.srcObject = remoteStream;
        // console.log('adicionando stream remota');
      }


      // pc.addStream(mediaStream);
      for(const track of mediaStream.getTracks()){
        pc.addTrack(track);
      }

      peers.set(peerId, pc);
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

  socket.on('peerDisconnected', peerId => {
    console.log('Peer Disconectou');
    removeRemoteVideo(peerId);
    removeRemoteVideo(peerId);
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
    const pc = peers.get(Answer.from);
    if(pc){
      console.log('Achou o peer', pc);
      pc.setRemoteDescription(new RTCSessionDescription(Answer.sdp))
        .catch(e => console.log('Error: ', e));
    }
  });
  
  socket.on('peerIceCandidate', ice => {
    console.log('recebendo ice');
    const pc = peers.get(ice.from);
    if(pc){
      console.log('Recebido iceCandidate de:', ice.from, pc);
      pc.addIceCandidate(new RTCIceCandidate(ice.candidate))
        .catch(e => console.log('Error: ', e))
    }
  })

  socket.on('connect', () => {
    if (room !== "") {
      console.log("Entrando na sala", room);
      socket.emit("join", room);
    }
  })

}

navigator.mediaDevices.getUserMedia({ video: true, audio: true})
  .then(mediaStream =>{
    handleUserMedia(mediaStream);
    startApp(mediaStream);
    console.log("Pegando userMedia com constraints:", { video: true,audio: true});
  })
  .catch(e => console.log('Error: ',e));

