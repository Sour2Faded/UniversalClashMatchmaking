const express = require("express");
const app = express();
app.use(express.json());

let lobbies = []; 
// Lobby schema: { id, hostId, hostName, maxPlayers, players: [{id, name}], hostIp }

function cleanupOldLobbies() {
  const now = Date.now();
  lobbies = lobbies.filter(l => now - l.createdAt < 1000 * 60 * 30); // 30 min timeout
}

// Create a lobby
app.post("/host", (req, res) => {
  const { hostId, hostName, maxPlayers } = req.body;
  const id = Date.now().toString();

  const newLobby = {
    id,
    hostId,
    hostName,
    maxPlayers,
    players: [{ id: hostId, name: hostName }],
    createdAt: Date.now(),
    hostIp: null
  };

  lobbies.push(newLobby);
  res.json({ success: true, lobbyId: id });
});

// List open lobbies (exclude full lobbies)
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

// Join a lobby
app.post("/join", (req, res) => {
  const { lobbyId, playerId, playerName } = req.body;
  const lobby = lobbies.find(l => l.id === lobbyId);

  if (!lobby) return res.json({ success: false, error: "Lobby not found" });
  if (lobby.players.find(p => p.id === playerId))
    return res.json({ success: false, error: "Player already in lobby" });
  if (lobby.players.length >= lobby.maxPlayers)
    return res.json({ success: false, error: "Lobby is full" });

  lobby.players.push({ id: playerId, name: playerName });

  // Remove lobby if full
  if (lobby.players.length >= lobby.maxPlayers) {
    lobbies = lobbies.filter(l => l.id !== lobbyId);
  }

  res.json({ success: true });
});

// Remove a player (host or any player leaving)
app.post("/leave", (req, res) => {
  const { lobbyId, playerId } = req.body;
  const lobby = lobbies.find(l => l.id === lobbyId);
  if (!lobby) return res.json({ success: false, error: "Lobby not found" });

  lobby.players = lobby.players.filter(p => p.id !== playerId);

  // Remove lobby if host left or no players remain
  if (lobby.hostId === playerId || lobby.players.length === 0) {
    lobbies = lobbies.filter(l => l.id !== lobbyId);
    return res.json({ success: true, lobbyRemoved: true });
  }

  res.json({ success: true, lobbyRemoved: false });
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

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Matchmaking server running on port ${port}`));
