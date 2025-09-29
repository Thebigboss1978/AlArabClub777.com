 import fs from "fs";
 import { OpenAI } from "openai";
 import dotenv from "dotenv";
 dotenv.config();

 const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Example agent prompts; customize per agent
 const AGENTS = [
   { id: "horus", prompt: "You are Horus, an oracle: give high-level priorities and strategy." },
   { id: "geetha", prompt: "You are Geetha, travel booking specialist: produce booking and UX actions." },
   { id: "suki", prompt: "You are Suki, support assistant: create FAQs and guest messages." },
   { id: "arak", prompt: "You are Arak, local guide: logistics and vendor suggestions." }
 ];

 export async function runAgents(projectId, input) {
   const resMap = {};
   for (const a of AGENTS) {
     try {
       const resp = await openai.chat.completions.create({
         model: "gpt-4o-mini",
         messages: [
           { role: "system", content: a.prompt },
           { role: "user", content: typeof input === 'string' ? input : JSON.stringify(input) }
         ],
         max_tokens: 700
       });
       const out = resp.choices?.[0]?.message?.content || '';
       resMap[a.id] = out;
       saveMemory(projectId, { type: "agent-output", agent: a.id, text: out });
     } catch (e) {
       console.error('Agent error', a.id, e.message);
       resMap[a.id] = null;
     }
   }

   // synthesis step
   try {
     const synth = await openai.chat.completions.create({
       model: "gpt-4o-mini",
       messages: [
         { role: "system", content: "You are a synthesizer that merges agent outputs into a prioritized plan." },
         { role: "user", content: JSON.stringify(resMap) }
       ],
       max_tokens: 800
     });
     const summary = synth.choices?.[0]?.message?.content || '';
     saveMemory(projectId, { type: "synthesis", text: summary });
     resMap['synthesis'] = summary;
   } catch (e) {
     console.error('Synthesis error', e.message);
     resMap['synthesis'] = null;
   }

   return resMap;
 }

 function saveMemory(projectId, entry) {
   const MEM_FILE = "./memories.json";
   if (!fs.existsSync(MEM_FILE)) fs.writeFileSync(MEM_FILE, JSON.stringify({ projects: {} }, null, 2));
   const mem = JSON.parse(fs.readFileSync(MEM_FILE, "utf-8"));
   mem.projects[projectId] = mem.projects[projectId] || [];
   mem.projects[projectId].push({ ts: Date.now(), ...entry });
   fs.writeFileSync(MEM_FILE, JSON.stringify(mem, null, 2));
 }
