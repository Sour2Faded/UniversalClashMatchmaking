const express = require("express");
const app = express();
app.use(express.json());

let lobbies = []; 
// Lobby schema: { id, hostId, hostName, maxPlayers, players: [{id, name, ready}], hostIp }

function cleanupOldLobbies() {
  const now = Date.now();
  lobbies = lobbies.filter(l => now - l.createdAt < 1000 * 60 * 30); // 30 min timeout
}

// Remove lobby if host disconnected unexpectedly
function removeLobbyIfHostDisconnected(hostId) {
  const lobby = lobbies.find(l => l.hostId === hostId);
  if (lobby) {
    lobbies = lobbies.filter(l => l.id !== lobby.id);
    console.log(`Lobby ${lobby.id} removed because host disconnected.`);
  }
}

// Host creates lobby
app.post("/host", (req, res) => {
  const { hostId, hostName, maxPlayers } = req.body;
  const id = Date.now().toString();
  lobbies.push({
    id,
    hostId,
    hostName,
    maxPlayers,
    players: [{ id: hostId, name: hostName, ready: false }],
    createdAt: Date.now(),
    hostIp: null
  });
  res.json({ success: true, lobbyId: id });
});

// Join a lobby
app.post("/join", (req, res) => {
  const { lobbyId, playerId, playerName } = req.body;
  const lobby = lobbies.find(l => l.id === lobbyId);
  if (!lobby) return res.json({ success: false, error: "Lobby not found" });
  if (lobby.players.find(p => p.id === playerId)) return res.json({ success: false, error: "Player already in lobby" });
  if (lobby.players.length >= lobby.maxPlayers) return res.json({ success: false, error: "Lobby is full" });

  lobby.players.push({ id: playerId, name: playerName, ready: false });

  res.json({ success: true });
});

// Leave lobby (host or player)
app.post("/leave", (req, res) => {
  const { lobbyId, playerId } = req.body;
  const lobby = lobbies.find(l => l.id === lobbyId);
  if (!lobby) return res.json({ success: false, error: "Lobby not found" });

  lobby.players = lobby.players.filter(p => p.id !== playerId);

  // Remove lobby if host left or empty
  if (lobby.hostId === playerId || lobby.players.length === 0) {
    lobbies = lobbies.filter(l => l.id !== lobbyId);
    return res.json({ success: true, lobbyRemoved: true });
  }

  res.json({ success: true, lobbyRemoved: false });
});

// Set ready state
app.post("/ready", (req, res) => {
  const { lobbyId, playerId, ready } = req.body;
  const lobby = lobbies.find(l => l.id === lobbyId);
  if (!lobby) return res.json({ success: false, error: "Lobby not found" });

  const player = lobby.players.find(p => p.id === playerId);
  if (!player) return res.json({ success: false, error: "Player not found" });

  player.ready = ready;

  // Start game if all players ready and lobby full
  const allReady = lobby.players.length === lobby.maxPlayers && lobby.players.every(p => p.ready);
  if (allReady) {
    lobbies = lobbies.filter(l => l.id !== lobbyId);
    return res.json({ success: true, gameStart: true, hostIp: lobby.hostIp });
  }

  res.json({ success: true, gameStart: false });
});

// Update host IP
app.post("/updateIp", (req, res) => {
  const { lobbyId, hostIp } = req.body;
  const lobby = lobbies.find(l => l.id === lobbyId);
  if (!lobby) return res.json({ success: false, error: "Lobby not found" });
  lobby.hostIp = hostIp;
  res.json({ success: true });
});

// Get host IP
app.get("/getHostIp", (req, res) => {
  const { lobbyId } = req.query;
  const lobby = lobbies.find(l => l.id === lobbyId);
  if (!lobby) return res.json({ success: false, error: "Lobby not found" });
  res.json({ hostIp: lobby.hostIp || "" });
});

// List lobbies (exclude full)
app.get("/list", (req, res) => {
  cleanupOldLobbies();
  const openLobbies = lobbies.filter(l => l.players.length < l.maxPlayers);
  res.json(openLobbies.map(l => ({
    id: l.id,
    hostName: l.hostName,
    currentPlayers: l.players.length,
    maxPlayers: l.maxPlayers
  })));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Matchmaking server running on port ${port}`));
