// index.js (Node.js + Socket.IO backend)
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
// Serve the frontend from /public
app.use(express.static('public'));  // e.g., http://localhost:3000/index.html:contentReference[oaicite:5]{index=5}

const server = http.createServer(app);
const io = socketIo(server);

const players = {};  // Track player positions: { socketId: {x, y}, ... }

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  // Send all existing players to the new client
  socket.emit('initPlayers', players);

  // Assign a random initial position for this player
  players[socket.id] = {
    x: Math.floor(Math.random() * 600 + 50),
    y: Math.floor(Math.random() * 400 + 50)
  };
  // Send the new player's position to that player
  socket.emit('initSelf', players[socket.id]);
  // Notify other players about the new player
  socket.broadcast.emit('newPlayer', { id: socket.id, ...players[socket.id] });

  // Handle movement updates from this client
  socket.on('move', (pos) => {
    players[socket.id] = pos;
    // Broadcast updated position to all other clients
    socket.broadcast.emit('playerMoved', { id: socket.id, ...pos });
  });

  // Relay WebRTC signaling messages to target clients
  socket.on('offer', data => {
    io.to(data.to).emit('offer', { from: socket.id, sdp: data.sdp });
  });
  socket.on('answer', data => {
    io.to(data.to).emit('answer', { from: socket.id, sdp: data.sdp });
  });
  socket.on('ice-candidate', data => {
    io.to(data.to).emit('ice-candidate', { from: socket.id, candidate: data.candidate });
  });

  // Handle client disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    delete players[socket.id];
    // Inform remaining clients to remove this avatar
    socket.broadcast.emit('playerLeft', socket.id);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
