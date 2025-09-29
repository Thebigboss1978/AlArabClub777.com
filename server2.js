// server.js — main coordinator (simple)
import express from "express";
import multer from "multer";
import fs from "fs";
import { execSync } from "child_process";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { OpenAI } from "openai";

dotenv.config();
const app = express();
const upload = multer({ dest: "uploads/" });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MEM_FILE = "./memories.json";
if (!fs.existsSync(MEM_FILE)) fs.writeFileSync(MEM_FILE, JSON.stringify({ projects: {} }, null, 2));

function extractMedia(filePath, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const audio = `${outDir}/audio.wav`;
  // extract audio (mono 16k)
  execSync(`ffmpeg -y -i "${filePath}" -vn -ac 1 -ar 16000 -f wav "${audio}"`);
  // extract 1 frame every 2 seconds (adjust)
  execSync(`ffmpeg -y -i "${filePath}" -vf fps=1/2 "${outDir}/frame-%03d.jpg"`);
  return { audio, framesDir: outDir };
}

async function transcribeAudio(audioPath) {
  // OpenAI's transcriptions endpoint expects a file form-data upload.
  const formData = new (await import("form-data")).default();
  formData.append("file", fs.createReadStream(audioPath));
  formData.append("model", "gpt-4o-transcribe"); // adjust if different model
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: formData,
  });
  if (!res.ok) throw new Error("Transcription failed: " + await res.text());
  const json = await res.json();
  return json.text;
}

// ask ChatGPT to summarize scenes given text + optional visual captions
async function askChatForScenes(transcript, captions = []) {
  const prompt = `You are an expert scene analyst. Given the transcript and visual captions, produce: 
1) A list of scenes with start-end rough times (if available). 
2) For each scene give a short description, mood, key objects, and suggested actions to automate (book, follow-up, highlight). 
Transcript:\n${transcript}\n\nCaptions:\n${captions.join("\n")}\n\nReturn JSON array of scenes.`;
  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 800,
  });
  const text = resp.choices?.[0]?.message?.content || "";
  // Try to parse JSON from answer
  try {
    const json = JSON.parse(text);
    return json;
  } catch (e) {
    // fallback: return raw text
    return { raw: text };
  }
}

// endpoint: upload video
app.post("/upload", upload.single("video"), async (req, res) => {
  try {
    const file = req.file;
    const out = `processed/${Date.now()}`;
    const { audio, framesDir } = extractMedia(file.path, out);
    console.log("Audio:", audio, "FramesDir:", framesDir);

    const transcript = await transcribeAudio(audio);
    console.log("Transcript length:", transcript.length);

    // collect few frames as captions (you can replace with image API)
    const frames = fs.readdirSync(framesDir).filter(f => f.endsWith(".jpg")).slice(0, 6);
    const captions = frames.map((f, i) => `${f} - placeholder caption (you should run vision API on ${framesDir}/${f})`);

    // ask chat to analyze
    const scenes = await askChatForScenes(transcript, captions);

    // save memory under project
    const projectId = req.body.projectId || "default";
    saveMemory(projectId, { type: "video-processing", transcript: transcript.slice(0,2000), scenes });

    res.json({ ok: true, transcript: transcript.slice(0,2000), scenes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// list memories
app.get("/memories/:projectId", (req, res) => {
  const mem = JSON.parse(fs.readFileSync(MEM_FILE, "utf-8"));
  res.json(mem.projects[req.params.projectId] || []);
});

// control endpoints (start/stop project) — simple toggles
const projectsState = {};
app.post("/project/:id/:action", (req, res) => {
  const { id, action } = req.params;
  projectsState[id] = projectsState[id] || { open: true };
  if (action === "open") projectsState[id].open = true;
  if (action === "close") projectsState[id].open = false;
  if (action === "status") {}
  res.json({ project: id, state: projectsState[id] });
});

app.listen(4000, ()=> console.log("Coordinator listening on :4000"));

