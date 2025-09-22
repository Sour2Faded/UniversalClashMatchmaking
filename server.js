const express = require("express");
const app = express();
app.use(express.json());

let games = []; // { id, hostIp, players }

app.post("/host", (req, res) => {
  const { hostIp } = req.body;
  const id = Date.now().toString();
  games.push({ id, hostIp, players: 1 });
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
  res.json({ success: true, hostIp: game.hostIp });
});

app.listen(3000, () => console.log("Matchmaking server running on 3000"));
