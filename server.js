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

const myRoom = {
  roomName: 'name',
  roomId: 'id',
  internal: { members: [] }
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

  socket.on("join", room => {

    myRoom.roomId = socket.id;
    myRoom.roomName = room;
    Object.freeze(myRoom);
    if (room == myRoom.roomName) {
      console.log(socket.id, "entrou na sala", room);
      myRoom.internal.members.push(socket.id);
      io.to(socket.id).emit('salute', myRoom.internal.members);
    }
    console.log('room name', myRoom.roomName);
    console.log('room id', myRoom.roomId);
    console.log('room members', myRoom.internal.members);
    console.log('room length', myRoom.internal.members.length);
    // io.to(myRoom.roomId).emit('salute', myRoom.internal.members);
    for (i = 0; i < myRoom.internal.members.length; i++) {
      // io.to(myRoom.internal.members[i]).emit('welcome', room);
      socket.to(myRoom.internal.members[i]).emit("peerConnected", { id: socket.id });
    }

  });

  socket.on('peerOffer',function(offer){
    const remotePeer = socketes.get(offer.to);
    console.log('Enviando Offer de', socket.id,'para', offer.to)
    remotePeer.emit('peerOffer',{from:socket.id, sdp:offer.sdp})
  });

  socket.on('peerAnswer',function(Answer){
    const remotePeer = socketes.get(Answer.to);
    console.log('Enviando Answer de', socket.id,'para', Answer.to)
    remotePeer.emit('peerAnswer',{from:socket.id, sdp:Answer.sdp})
  });

  socket.on('peerIceCandidate', ice => {
    const remotePeer = socketes.get(ice.to);
    console.log('iceCandidate de',socket.id,'para', ice.to);
    remotePeer.emit('peerIceCandidate',{from: socket.id, candidate: ice.candidate}) 
  });

  socket.on('disconnect', reason => {
    socketes.delete(socket.id);
    console.log('peer',socket.id,'disconectado');
    socket.broadcast.emit('peerDisconnected', socket.id);
  });

});
