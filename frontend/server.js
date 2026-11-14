// Node.js-Webserver: liefert das Frontend aus und leitet /api an die Python-API weiter.
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3000);
const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

const app = express();
app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

// Proxy: /api/* -> Python-Backend
app.all("/api/*", async (req, res) => {
  try {
    const upstream = await fetch(API_URL + req.originalUrl, {
      method: req.method,
      headers: { "content-type": "application/json" },
      body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body),
    });
    res.status(upstream.status);
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
