const express = require("express");
const app = express();
app.use(express.json());

let games = []; 
// Game schema: 
// { id, hostIp, players: [{id, name, ready}], maxPlayers, createdAt }

function cleanupExpiredGames() {
  const now = Date.now();
  games = games.filter(g => now - g.createdAt < 1000 * 60 * 30); // 30 min timeout
}

// Create/host a game
app.post("/host", (req, res) => {
  const { hostIp, maxPlayers, playerId, playerName } = req.body;
  const id = Date.now().toString();

  const newGame = {
    id,
    hostIp,
    maxPlayers,
    players: [{ id: playerId, name: playerName, ready: false }],
    createdAt: Date.now()
  };

  games.push(newGame);
  res.json({ success: true, gameId: id });
});

// List open games
app.get("/list", (req, res) => {
  cleanupExpiredGames();
  res.json(games.map(g => ({
    id: g.id,
    hostIp: g.hostIp,
    currentPlayers: g.players.length,
    maxPlayers: g.maxPlayers
  })));
});

// Join a game
app.post("/join", (req, res) => {
  const { gameId, playerId, playerName } = req.body;
  const game = games.find(g => g.id === gameId);

  if (!game) return res.json({ success: false, error: "Game not found" });
  if (game.players.find(p => p.id === playerId))
    return res.json({ success: false, error: "Player already in game" });
  if (game.players.length >= game.maxPlayers)
    return res.json({ success: false, error: "Game is full" });

  game.players.push({ id: playerId, name: playerName, ready: false });

  res.json({ success: true, hostIp: game.hostIp, gameFull: game.players.length >= game.maxPlayers });
});

// Set ready state
app.post("/ready", (req, res) => {
  const { gameId, playerId, ready } = req.body;
  const game = games.find(g => g.id === gameId);
  if (!game) return res.json({ success: false, error: "Game not found" });

  const player = game.players.find(p => p.id === playerId);
  if (!player) return res.json({ success: false, error: "Player not found in game" });

  player.ready = ready;

  // Check if all players are ready
  const allReady = game.players.length === game.maxPlayers &&
                   game.players.every(p => p.ready);

  if (allReady) {
    // Game is starting → remove from lobby
    games = games.filter(g => g.id !== gameId);
    return res.json({ success: true, gameStart: true, hostIp: game.hostIp });
  }

  res.json({ success: true, gameStart: false });
});

// Get player list for a game
app.get("/players/:gameId", (req, res) => {
  const game = games.find(g => g.id === req.params.gameId);
  if (!game) return res.json({ success: false, error: "Game not found" });

  res.json({
    success: true,
    players: game.players
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Matchmaking server running on port ${port}`));
