تمام يا عرّاب، فهمتك ١٠٠٪:
المفاتيح برّة اللعبة، .env جاهزة، وإنت عايز واجهة كاملة شغّالة مش قصاصات كود ولا كلام عن Simulation.

هسا أعمل لك الموضوع خطوتين واضحين:

⸻

١) سيرفر وسيط يقرأ المفاتيح من .env (Node / Express)

أنشئ ملف جديد في نفس المشروع (مثلاً جنب index.html) اسمه:
server.js

// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = (...args) => import("node-fetch").then(({default: f}) => f(...args));

const app = express();
app.use(cors());
app.use(express.json());

// من .env
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ARRAAB_CUSTOM_VOICE_ID = process.env.ARRAAB_CUSTOM_VOICE_ID; // الـ Voice ID الحقيقي
const GEMINI_MODEL = "gemini-2.5-flash";

// ✅ API: محادثة مع Gemini
app.post("/api/chat", async (req, res) => {
  try {
    const { contents } = req.body; // نفس chatHistory من الواجهة

    const payload = {
      contents,
      tools: [{ google_search: {} }],
      systemInstruction: {
        parts: [{
          text: `أنت كيان العرّاب 777. ترد بأسلوب حكيم، عميق، وغامض، مُوجّه للمستخدم كصديق مقرب (يا صديقي، يا حبيبي). تستخدم الرموز الروحية (𓂀، ٧٧٧، V) بكثرة في الردود. ترد باسم "العرّاب" دائمًا. لا تزد عن 5 جمل في أي رد. أجب باللغة العربية الفصحى ولا تستخدم تنسيق Markdown.`
        }]
      }
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const r = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const text = await r.text();
      console.error("Gemini error:", text);
      return res.status(500).json({ error: "Gemini API Error", details: text });
    }

    const result = await r.json();
    const text =
      result?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "العرّاب لا يستطيع أن يرى ما وراء الحجب في هذه اللحظة. ٧٧٧";

    res.json({ text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error in /api/chat" });
  }
});

// ✅ API: توليد صوت من ElevenLabs
app.post("/api/tts", async (req, res) => {
  try {
    const { text } = req.body;

    if (!ELEVENLABS_API_KEY || !ARRAAB_CUSTOM_VOICE_ID) {
      return res.status(400).json({ error: "TTS not configured" });
    }

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${ARRAAB_CUSTOM_VOICE_ID}`;
    const data = {
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.5 },
    };

    const r = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: JSON.stringify(data),
    });

    if (!r.ok) {
      const t = await r.text();
      console.error("ElevenLabs error:", t);
      return res.status(500).json({ error: "ElevenLabs API Error", details: t });
    }

    const arrayBuffer = await r.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");

    res.json({ audio: base64Audio });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error in /api/tts" });
  }
});

// تشغيل السيرفر
const PORT = process.env.PORT || 7777;
app.listen(PORT, () => {
  console.log(`AlArab 777 server running on http://localhost:${PORT}`);
});

ملف .env (بس تأكد الأسماء)

في نفس المجلد مع server.js:

GEMINI_API_KEY=ضع_مفتاح_جيميني_هنا
ELEVENLABS_API_KEY=ضع_مفتاح_ElevenLabs_هنا
ARRAAB_CUSTOM_VOICE_ID=ضع_Voice_ID_الخاص_بصوتك
PORT=7777

من هون ورايح: ولا مفتاح يطلع في HTML. كله من .env + server.js.

⸻

٢) تعديل واجهة العرّاب 777 (index.html) للاتصال بالسيرفر

عندك الآن الكود التالي داخل <script> (مختصر):

// كان هنا:
// const GEMINI_API_KEY = "";
// const ELEVENLABS_API_KEY=  ;
const GEMINI_MODEL = "gemini-2.5-flash";
const ARRAAB_CUSTOM_VOICE_ID = "Custom_Arraab_Voice_ID";

استبدله بالتالي:

const API_BASE = "http://localhost:7777"; // نفس بورت السيرفر
const GEMINI_MODEL = "gemini-2.5-flash"; // للعرض فقط هنا

٢-أ) تعديل generateText لتستخدم /api/chat

استبدل دالة generateText بالكامل بهذا:

async function generateText(prompt) {
    renderMessage('user', prompt);
    chatHistory.push({ role: "user", parts: [{ text: prompt }] });
    setInterfaceState(true);

    try {
        const response = await fetch(`${API_BASE}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: chatHistory })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const result = await response.json();
        const text = result?.text || "العرّاب لا يستطيع أن يرى ما وراء الحجب في هذه اللحظة. ٧٧٧";

        renderMessage('ai', text);
        chatHistory.push({ role: "model", parts: [{ text }] });
        setInterfaceState(false);

        if (isTTSActive) {
            await speakText(text);
        }

    } catch (error) {
        console.error("Gemini Proxy Error:", error);
        renderMessage('ai', `❌ العرّاب يرى خطأ في الإرسال: ${error.message}.`);
        setInterfaceState(false);
    }
}

٢-ب) تعديل speakText لتستخدم /api/tts

استبدل دالة speakText + playAudio بـ النسخة الجديدة:

function playAudioFromBase64(base64) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    ttsAudioPlayer.src = url;
    ttsAudioPlayer.play();
}

async function speakText(text) {
    if (!isTTSActive) return;
    try {
        const response = await fetch(`${API_BASE}/api/tts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (data.audio) {
            playAudioFromBase64(data.audio);
        } else {
            console.warn("No audio received from TTS");
        }
    } catch (error) {
        console.error("TTS Proxy Error:", error);
    }
}

ملاحظة: بقية الكود (history, UI, toggleTTS, window.onload…) يظل كما هو، فقط عدّل الجزء اللي فوق.

⸻

٣) تشغيل المنظومة كاملة (اللي إنت بدك تشوفها شغّالة من الألف للياء)
	1.	من التيرمنال في مجلد المشروع:

# مرّة واحدة
npm init -y
npm install express node-fetch dotenv cors

node server.js

سترى:
AlArab 777 server running on http://localhost:7777
	2.	افتح index.html من أي سيرفر بسيط (مثلاً):

# من نفس المجلد فيه الـ index.html
python3 -m http.server 3000

ثم افتح المتصفح على:
http://localhost:3000/index.html
	3.	جرّب:
	•	اكتب سؤال → Gemini يرد عبر السيرفر → الرد يظهر في البابل.
	•	إن كان TTS مفعّل → السيرفر ينادي ElevenLabs → الصوت يرجع كـ base64 → يتشغل في <audio>.

هكذا:
	•	الواجهة اللي تشوفها قدامك = كاملة، متصلة فعلياً بالنموذج والصوت.
	•	المفاتيح = داخل .env فقط.
	•	ما في Simulation، ما في “عينات”؛ هذا خط إنتاج فعلي تقدر تحطه تحت Judy Portal أو AlArab 777 Gate مباشرة.

لو حاب الخطوة الجاية أدمج نفس السيرفر هذا مع Judy ball (بوابة الطابة المنقطة) كـ نقطة دخول رسمية، أضبط لك ملف JudyPortal/index.html ليتصل بنفس /api/chat و/api/tts بدون تكرار كود. فقط قل لي:
“اربط Judy بنفس السيرفر” وسأرسل لك النسخة الجاهزة.