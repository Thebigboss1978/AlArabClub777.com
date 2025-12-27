import express from "express";
import multer from "multer";
import fs from "fs";
import { execSync } from "child_process";
import dotenv from "dotenv";
import fetch from "node-fetch";
import FormData from "form-data";
import { OpenAI } from "openai";
import { runAgents } from "./agent_controller.js";

dotenv.config();
const app = express();
const upload = multer({ dest: "uploads/" });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(express.json({ limit: "1mb" }));

const MEM_FILE = "./memories.json";
if (!fs.existsSync(MEM_FILE)) fs.writeFileSync(MEM_FILE, JSON.stringify({ projects: {} }, null, 2));

function saveMemory(projectId, entry) {
  const mem = JSON.parse(fs.readFileSync(MEM_FILE, "utf-8"));
  mem.projects[projectId] = mem.projects[projectId] || [];
  mem.projects[projectId].push({ ts: Date.now(), ...entry });
  fs.writeFileSync(MEM_FILE, JSON.stringify(mem, null, 2));
}

function extractMedia(filePath, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const audio = `${outDir}/audio.wav`;
  execSync(`ffmpeg -y -i "${filePath}" -vn -ac 1 -ar 16000 -f wav "${audio}"`);
  execSync(`ffmpeg -y -i "${filePath}" -vf fps=1/2 "${outDir}/frame-%03d.jpg"`);
  return { audio, framesDir: outDir };
}

async function transcribeAudio(audioPath) {
  const formData = new FormData();
  formData.append("file", fs.createReadStream(audioPath));
  formData.append("model", "gpt-4o-transcribe");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: formData,
  });
  if (!res.ok) throw new Error("Transcription failed: " + await res.text());
  const json = await res.json();
  return json.text;
}

async function askChatForScenes(transcript, captions = []) {
  const prompt = `You are an expert scene analyst. Given the transcript and visual captions, produce:
1) A list of scenes with rough times if available.
2) For each scene, provide short description, mood, key objects, and suggested actions (book, follow-up, highlight).
Transcript:\n${transcript}\n\nCaptions:\n${captions.join("\n")}\n\nReturn JSON array of scenes.`;
  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 800,
  });
  const text = resp.choices?.[0]?.message?.content || "";
  try {
    return JSON.parse(text);
  } catch (e) {
    return { raw: text };
  }
}

app.post("/upload", upload.single("video"), async (req, res) => {
  try {
    const file = req.file;
    const out = `processed/${Date.now()}`;
    const { audio, framesDir } = extractMedia(file.path, out);

    const transcript = await transcribeAudio(audio);

    const frames = fs.readdirSync(framesDir).filter(f => f.endsWith(".jpg")).slice(0, 6);
    const captions = frames.map((f) => `${framesDir}/${f} - placeholder caption`);

    const scenes = await askChatForScenes(transcript, captions);

    const projectId = req.body.projectId || "default";
    saveMemory(projectId, { type: "video-processing", transcript: transcript.slice(0,2000), scenes });

    // run agents to enrich analysis (Horus, Geetha, etc.)
    const agentResult = await runAgents(projectId, { transcript, scenes });

    res.json({ ok: true, transcript: transcript.slice(0,2000), scenes, agents: agentResult });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

app.post("/api/gemini", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: "Missing GEMINI_API_KEY in .env" });
    }

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const { contents = [], systemInstruction, tools = [] } = req.body || {};
    if (!Array.isArray(contents) || contents.length === 0) {
      return res.status(400).json({ error: "contents must be a non-empty array" });
    }

    const payload = {
      contents,
      systemInstruction,
      tools,
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: await response.text() });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
});

app.post("/api/tts", async (req, res) => {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ALARAB_CUSTOM_VOICE_ID;
    if (!apiKey || !voiceId) {
      return res.status(400).json({ error: "Missing ELEVENLABS_API_KEY or ALARAB_CUSTOM_VOICE_ID in .env" });
    }

    const { text } = req.body || {};
    if (!text) {
      return res.status(400).json({ error: "text is required" });
    }

    const ttsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    const response = await fetch(ttsUrl, {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.5 },
      }),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: await response.text() });
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    return res.send(audioBuffer);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
});

app.get("/memories/:projectId", (req, res) => {
  const mem = JSON.parse(fs.readFileSync(MEM_FILE, "utf-8"));
  res.json(mem.projects[req.params.projectId] || []);
});

const projectsState = {};
app.post("/project/:id/:action", (req, res) => {
  const { id, action } = req.params;
  projectsState[id] = projectsState[id] || { open: true };
  if (action === "open") projectsState[id].open = true;
  if (action === "close") projectsState[id].open = false;
  res.json({ project: id, state: projectsState[id] });
});

app.listen(4000, () => console.log("Coordinator listening on :4000"));
