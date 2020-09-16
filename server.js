var static = require("node-static");
var http = require("http");
var port = 3001;
// Create a node-static server instance
var file = new static.Server();

// We use the http module�s createServer function and
// rely on our instance of node-static to serve the files
var app = http
  .createServer(function (req, res) {
    file.serve(req, res);
  })
  .listen(port);

console.log("Listening on " + app.address().port);

// Use socket.io JavaScript library for real-time web applications
var io = require("socket.io").listen(app);

// Let's start managing connections...
io.sockets.on("connection", function (socket) {

  // Handle 'join' messages
  socket.on("join", function (room) {
    
    console.log('Peer:',socket.id,"Entrando na sala", room);
    socket.join(room, () => {
      console.log(`Emitindo peerConnected para sala ${room}`);
      // Emite peerConnected quando um segundo cliente entra;
      socket.to(room).emit('peerConnected', {id: socket.id});
    });
  });

  socket.on('peerOffer',function(offer){
    const remotePeer = offer.to;
    console.log('Enviando Offer de', socket.id,'para', remotePeer)
    socket.broadcast.emit('peerOffer',{from:socket.id, sdp:offer.sdp})
  });

  socket.on('peerAnswer',function(Answer){
    const remotePeer = Answer.to;
    console.log('Enviando Answer de', socket.id,'para', remotePeer)
    socket.broadcast.emit('peerAnswer',{from:socket.id, sdp:Answer.sdp})
  });

  socket.on('peerIceCandidate', ice => {
    console.log('iceCandidate de',socket.id,'para', ice.to);
    socket.broadcast.emit('peerIceCandidate',{from: socket.id, candidate: ice.candidate}) 
  });

});
