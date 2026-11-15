// Node.js-Webserver: liefert das Frontend aus und leitet /api an die Python-API weiter.
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "public");
const PORT = Number(process.env.PORT ?? 3000);
const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

// Fragt die Python-API, ob die Anfrage zu einer gültigen Sitzung gehört.
async function isLoggedIn(req) {
  if (!req.headers.cookie) return false;
  try {
    const r = await fetch(`${API_URL}/api/me`, { headers: { cookie: req.headers.cookie } });
    return r.ok;
  } catch {
    return false;
  }
}

// Seiten: angemeldete Nutzer landen auf der Startseite, alle anderen beim Login.
const page = (file) => (_req, res) => res.sendFile(path.join(PUBLIC, file));
const onlyGuests = async (req, res, next) => ((await isLoggedIn(req)) ? res.redirect("/start") : next());
const onlyUsers = async (req, res, next) => ((await isLoggedIn(req)) ? next() : res.redirect("/"));

app.get("/", onlyGuests, page("login.html"));
app.get("/registrieren", onlyGuests, page("register.html"));
app.get("/start", onlyUsers, page("start.html"));
app.use(express.static(PUBLIC, { index: false, extensions: [] }));

// Proxy: /api/* -> Python-Backend (inkl. Cookies in beide Richtungen)
app.all("/api/*", async (req, res) => {
  const headers = { "content-type": "application/json" };
  if (req.headers.cookie) headers.cookie = req.headers.cookie;
  try {
    const upstream = await fetch(API_URL + req.originalUrl, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body ?? {}),
    });
    const cookies = upstream.headers.getSetCookie();
    if (cookies.length) res.setHeader("set-cookie", cookies);
    res.status(upstream.status);
    if (upstream.status === 204) return res.end();
    res.type(upstream.headers.get("content-type") ?? "application/json");
    res.send(await upstream.text());
  } catch (err) {
    console.error("API nicht erreichbar:", err.message);
    res.status(502).json({ detail: "Der Server ist momentan nicht erreichbar. Bitte später erneut versuchen." });
  }
});

app.listen(PORT, () => {
  console.log(`Frontend läuft auf http://localhost:${PORT} (API: ${API_URL})`);
});
