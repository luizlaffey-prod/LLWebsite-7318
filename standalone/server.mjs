// Mini-servidor local (sem dependências) para o Roteirista IA standalone.
// Serve roteirista-ia.html e faz proxy das chamadas para o gateway da Angel AI
// Labs, evitando problemas de CORS no navegador. Sua chave de API nunca sai da
// sua máquina (vai do navegador -> este proxy local -> Angel AI Labs).
//
// Uso:
//   node standalone/server.mjs
// Depois abra http://localhost:5800 no navegador.

import { createServer } from "node:http";
import { request as httpsRequest } from "node:https";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 5800;
const ANGEL_HOST = "ai-labs.angel-tools.io";

const server = createServer((req, res) => {
  // Proxy transparente para a API da Angel (mesma origem -> sem CORS).
  if (req.url.startsWith("/api/v1/")) {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const body = Buffer.concat(chunks);
      const proxyReq = httpsRequest(
        {
          host: ANGEL_HOST,
          path: req.url,
          method: req.method,
          headers: {
            "content-type": req.headers["content-type"] || "application/json",
            authorization: req.headers["authorization"] || "",
            "content-length": body.length,
          },
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 502, {
            "content-type": proxyRes.headers["content-type"] || "application/json",
          });
          proxyRes.pipe(res);
        }
      );
      proxyReq.on("error", (e) => {
        res.writeHead(502, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: String(e) }));
      });
      proxyReq.end(body);
    });
    return;
  }

  // Servir o app.
  readFile(join(__dirname, "roteirista-ia.html"))
    .then((html) => {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(html);
    })
    .catch(() => {
      res.writeHead(404);
      res.end("roteirista-ia.html não encontrado");
    });
});

server.listen(PORT, () => {
  console.log(`\n  🎬 Roteirista IA rodando em:  http://localhost:${PORT}\n`);
  console.log("  Abra esse endereço no navegador, cole sua chave aal_... em");
  console.log("  ⚙️ Configuração da IA e gere o roteiro.\n");
});
