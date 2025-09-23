// server.js
import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

let lobbies = {};
let lobbyIdCounter = 1;

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  socket.on("findMatch", () => {
    // Find a lobby with space
    let lobby = Object.values(lobbies).find(l => l.players.length < l.maxPlayers);

    if (!lobby) {
      // Create new lobby
      const newLobbyId = lobbyIdCounter++;
      lobbies[newLobbyId] = {
        id: newLobbyId,
        players: [],
        maxPlayers: 2 // set max players per match here
      };
      lobby = lobbies[newLobbyId];
    }

    lobby.players.push(socket.id);
    socket.join(`lobby_${lobby.id}`);
    io.to(socket.id).emit("joinedLobby", { lobbyId: lobby.id, players: lobby.players });

    // Notify all in lobby
    io.to(`lobby_${lobby.id}`).emit("lobbyUpdate", lobby);

    if (lobby.players.length >= lobby.maxPlayers) {
      io.to(`lobby_${lobby.id}`).emit("startGame", { lobbyId: lobby.id });
    }
  });

  socket.on("disconnect", () => {
    for (const lobby of Object.values(lobbies)) {
      lobby.players = lobby.players.filter(p => p !== socket.id);
      if (lobby.players.length === 0) {
        delete lobbies[lobby.id];
      } else {
        io.to(`lobby_${lobby.id}`).emit("lobbyUpdate", lobby);
      }
    }
  });
});

server.listen(3000, () => {
  console.log("Matchmaking server running on port 3000");
});
