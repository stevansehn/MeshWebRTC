const static = require("node-static");
const http = require("http");
const port = 3014;
// Create a node-static server instance
const file = new static.Server();

// We use the http module�s createServer function and
// rely on our instance of node-static to serve the files
const app = http
  .createServer(function (req, res) {
    file.serve(req, res);
  })
  .listen(port);

console.log("Listening on " + app.address().port);

// Use socket.io JavaScript library for real-time web applications
const io = require("socket.io").listen(app);

const socketes = new Map();
const roomsMap = new Map();

const emitToRoom = (room, evt) => {
  for (let [key, value] of roomsMap) {
    if (value == room) {
      io.to(key).emit(evt);
    }
  }
};

const emitPeerConnected = (myMap, room, socketId) => {
  let arr = Array.from(myMap.values());
  if (arr.filter((x) => x == room).length > 1) {
    for (let [key, value] of myMap) {
      if (value == room) {
        console.log(`Emitindo peerConnected para sala ${room}`);
        io.to(key).emit("peerConnected", { id: socketId });
      }
    }
  }
};

// Let's start managing connections...
io.sockets.on("connection", function (socket) {
  socketes.set(socket.id, socket);

  // Handle 'join' messages
  // socket.on("join", function (room) {

  //   console.log('Peer:',socket.id,"Entrando na sala", room);
  //   socket.join(room, () => {
  //     console.log(`Emitindo peerConnected para sala ${room}`);
  //     // Emite peerConnected quando um segundo cliente entra;
  //     socket.to(room).emit('peerConnected', {id: socket.id});
  //   });
  // });

  socket.on("join", (room) => {
    roomsMap.set(socket.id, room);
    console.log("S:", roomsMap);
    // emitToRoom(room, "salute");
    emitPeerConnected(roomsMap, room, socket.id);
  });

  socket.on("peerOffer", function (offer) {
    const remotePeer = socketes.get(offer.to);
    console.log("Enviando Offer de", socket.id, "para", offer.to);
    remotePeer.emit("peerOffer", { from: socket.id, sdp: offer.sdp });
  });

  socket.on("peerAnswer", function (Answer) {
    const remotePeer = socketes.get(Answer.to);
    console.log("Enviando Answer de", socket.id, "para", Answer.to);
    remotePeer.emit("peerAnswer", { from: socket.id, sdp: Answer.sdp });
  });

  socket.on("peerIceCandidate", (ice) => {
    const remotePeer = socketes.get(ice.to);
    console.log("iceCandidate de", socket.id, "para", ice.to);
    remotePeer.emit("peerIceCandidate", {
      from: socket.id,
      candidate: ice.candidate,
    });
  });

  socket.on("disconnect", (reason) => {
    socketes.delete(socket.id);
    roomsMap.delete(socket.id);
    console.log("peer", socket.id, "desconectado");
    socket.broadcast.emit("peerDisconnected", socket.id);
    console.log("S:", roomsMap);
  });
});
