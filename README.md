# AlArab Storm Processor - Prototype

This repository is a ready-to-run prototype that:
- Accepts video uploads
- Extracts audio & frames (requires ffmpeg)
- Sends audio to OpenAI transcription API (Whisper-like)
- Asks OpenAI chat to analyze scenes and synthesizes agent outputs
- Stores memories locally (memories.json)
- Exposes simple control endpoints (open/close project)

## Prerequisites

- Node.js 18+
- ffmpeg (install via Homebrew: `brew install ffmpeg`)
- An OpenAI API key (set in `.env` or environment variables)
- Optional: keys for Runway / Anthropic if you want better vision or multi-model

## Quick start

1. Copy `.env.example` to `.env` and fill your keys.
2. Install deps:
   ```bash
   npm install
   ```
3. Run:
   ```bash
   node server.js
   ```
4. Upload a video:
   ```bash
   curl -F "video=@/path/to/video.mp4" -F "projectId=AlArabClub777" http://localhost:4000/upload
   ```

## Files

- `server.js` - Main coordinator server (video ingest, media extraction, transcription, scene analysis)
- `agent_controller.js` - Agent orchestration helper (multi-agent runner & memory saver)
- `public/voice.html` - Browser voice UI (STT/TTS) to interact with APIs
- `memories.json` - Local memory store (created at runtime)

## Next steps

- Replace placeholder vision captions with a real vision API (Runway / HuggingFace)
- Add job queue for long videos (BullMQ + Redis)
- Move memories to a vector DB for scalable retrieval (Pinecone / Weaviate)
- Deploy backend to a server (or Vercel with serverless adaptation)

