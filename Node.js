// api/server.js
import express from "express";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

let memory = [];

app.post("/api/send", (req, res) => {
  const entry = {
    date: new Date().toISOString(),
    type: "TALK",
    source: "Human",
    content: req.body.text
  };

  memory.push(entry);

  res.json({
    status: "STORED",
    entry,
    entriesCount: memory.length
  });
});

app.get("/api/state", (req, res) => {
  res.json({
    status: "LISTENING",
    entries: memory.length,
    last: memory[memory.length - 1] || null
  });
});

app.listen(3001, () => {
  console.log("Runner API listening on 3001");
});