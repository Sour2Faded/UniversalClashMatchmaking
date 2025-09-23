const express = require("express");
const app = express();
app.use(express.json());

let games = []; // { id, hostIp, players, maxPlayers }

app.post("/host", (req, res) => {
  const { hostIp, maxPlayers } = req.body;
  const id = Date.now().toString();
  games.push({ id, hostIp, players: 1, maxPlayers });
  res.json({ success: true, gameId: id });
});

app.get("/list", (req, res) => {
  res.json(games);
});

app.post("/join", (req, res) => {
  const { gameId } = req.body;
  const game = games.find(g => g.id === gameId);
  if (!game) return res.json({ success: false, error: "Game not found" });

  game.players++;
  if (game.players >= game.maxPlayers) {
    // Game is full, remove from list
    games = games.filter(g => g.id !== gameId);
    res.json({ success: true, hostIp: game.hostIp, gameFull: true });
  } else {
    res.json({ success: true, hostIp: game.hostIp, gameFull: false });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
