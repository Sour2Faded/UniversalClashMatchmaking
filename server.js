const express = require("express");
const app = express();
app.use(express.json());

let lobbies = []; 
// Lobby schema: { id, hostId, hostName, maxPlayers, players: [{id, name}] }

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
    createdAt: Date.now()
  };

  lobbies.push(newLobby);
  res.json({ success: true, lobbyId: id });
});

// List open lobbies
app.get("/list", (req, res) => {
  cleanupOldLobbies();
  res.json(lobbies.map(l => ({
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
  res.json({ success: true });
});

// Get list of players in a lobby
app.get("/players/:lobbyId", (req, res) => {
  const lobby = lobbies.find(l => l.id === req.params.lobbyId);
  if (!lobby) return res.json({ success: false, error: "Lobby not found" });

  res.json({ success: true, players: lobby.players });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Matchmaking server running on port ${port}`));
