#!/usr/bin/env bash
set -euo pipefail

VERSION="v2.0"
PACKNAME="FinalPortalAgentPack-${VERSION}"

# ===== 1) إنشاء الهيكل لو مش موجود =====
mkdir -p "${PACKNAME}"/{api,worker,dashboard,pages,styles,assets/{logos,avatars,screens,safari,fx},scripts}

# ===== 2) ملفات أساسية =====
if [ ! -f "${PACKNAME}/README.md" ]; then
cat > "${PACKNAME}/README.md" <<'EOF'
# FinalPortalAgentPack v2.0
Structure:
- api/: endpoints
- worker/: background jobs
- dashboard/: agent UI
- pages/: landing, terms, upload
- styles/: CSS
- assets/: logos, avatars, screens, safari, fx
- scripts/: tools (packaging, update)
EOF
fi

if [ ! -f "${PACKNAME}/.env.example" ]; then
cat > "${PACKNAME}/.env.example" <<'EOF'
REDIS_URL=redis://:password@host:6379
S3_BUCKET=alarab-media
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_CHAT_ID=@alarab
MASTODON_INSTANCE=https://mastodon.social
MASTODON_TOKEN=xxx
WEBHOOK_SECRET=super-secret-777
EOF
fi

# ===== 3) ملف API بسيط =====
if [ ! -f "${PACKNAME}/api/gallery.js" ]; then
cat > "${PACKNAME}/api/gallery.js" <<'EOF'
export default async function handler(req,res){
  if(req.method!=="GET") return res.status(405).end();
  res.json([{url:"/assets/gallery/demo.jpg",thumb:"/assets/gallery/demo.jpg",author:"system"}]);
}
EOF
fi

# ===== 4) Dashboard =====
if [ ! -f "${PACKNAME}/dashboard/index.html" ]; then
cat > "${PACKNAME}/dashboard/index.html" <<'EOF'
<!doctype html><html lang="ar" dir="rtl"><head>
<meta charset="utf-8"><title>Agent Dashboard</title>
<link rel="stylesheet" href="/styles/main.css"></head>
<body>
<h1>AlArab — Agent Dashboard</h1>
<div id="gallery"></div>
<script>
async function loadGallery(){
  const r = await fetch('/api/gallery');
  const items = await r.json();
  document.getElementById('gallery').innerHTML = items.map(i=>`<img src="${i.thumb}" width=200/>`).join('');
}
loadGallery(); setInterval(loadGallery,5000);
</script>
</body></html>
EOF
fi

# ===== 5) سكربت ضغط إلى zip =====
if [ ! -f "${PACKNAME}/scripts/create_zip.sh" ]; then
cat > "${PACKNAME}/scripts/create_zip.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
if [ -z "${1-}" ]; then
  echo "Usage: $0 <packname>"
  exit 1
fi
PACKNAME="$1"
OUT="${PACKNAME}.zip"
echo "==> Creating $OUT"
zip -r "$OUT" "$PACKNAME" -x '**/node_modules/*'
echo "==> Done: $OUT"
EOF
chmod +x "${PACKNAME}/scripts/create_zip.sh"
fi

echo "✅ Project ready at ${PACKNAME}/"
echo "Run:  ./FinalPortalAgentPack-v2.0/scripts/create_zip.sh FinalPortalAgentPack-v2.0"
