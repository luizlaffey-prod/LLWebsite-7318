// Mini-servidor local (sem dependências) para o Roteirista IA standalone.
// Serve roteirista-ia.html e faz proxy das chamadas para o gateway da Angel AI
// Labs, evitando problemas de CORS no navegador. Sua chave de API nunca sai da
// sua máquina (vai do navegador -> este proxy local -> Angel AI Labs).
//
// Uso:
//   node standalone/server.mjs
// Depois abra http://localhost:5800 no navegador (NÃO abra o .html direto).

import { createServer } from "node:http";
import { request as httpsRequest } from "node:https";
import { readFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 5800;
const ANGEL_HOST = "ai-labs.angel-tools.io";
const HTML_PATH = join(__dirname, "roteirista-ia.html");

const ts = () => new Date().toISOString().slice(11, 19);
const log = (...a) => console.log(`[${ts()}]`, ...a);

const server = createServer((req, res) => {
  // Proxy transparente para a API da Angel (mesma origem -> sem CORS).
  if (req.url.startsWith("/api/v1/")) {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const body = Buffer.concat(chunks);
      const auth = req.headers["authorization"] || "";
      if (req.method === "POST" && !auth) {
        log("⚠  POST sem Authorization — você colou a chave aal_ na página?");
      }
      const proxyReq = httpsRequest(
        {
          host: ANGEL_HOST,
          path: req.url,
          method: req.method,
          headers: {
            "content-type": req.headers["content-type"] || "application/json",
            authorization: auth,
            "content-length": body.length,
          },
        },
        (proxyRes) => {
          const status = proxyRes.statusCode || 502;
          log(`→ ${req.method} ${req.url.split("?")[0]}  ←  ${status}`);
          // Captura o corpo para conseguir logar falhas do gateway.
          const out = [];
          proxyRes.on("data", (c) => out.push(c));
          proxyRes.on("end", () => {
            const buf = Buffer.concat(out);
            if (status >= 400) log(`   gateway respondeu ${status}: ${buf.toString().slice(0, 300)}`);
            else {
              const txt = buf.toString();
              if (/"status"\s*:\s*"failed"/.test(txt)) {
                log(`   ⚠ predição falhou: ${txt.slice(0, 300)}`);
              }
            }
            res.writeHead(status, { "content-type": proxyRes.headers["content-type"] || "application/json" });
            res.end(buf);
          });
        }
      );
      proxyReq.on("error", (e) => {
        log(`✗ erro ao falar com o gateway Angel: ${e.message}`);
        res.writeHead(502, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "Falha ao conectar ao gateway Angel: " + e.message }));
      });
      proxyReq.end(body);
    });
    return;
  }

  // Servir o app.
  readFile(HTML_PATH)
    .then((html) => {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(html);
    })
    .catch(() => {
      log("✗ roteirista-ia.html não encontrado ao lado de server.mjs");
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("roteirista-ia.html não encontrado. Coloque os dois arquivos na MESMA pasta.");
    });
});

server.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    console.error(`\n  ✗ A porta ${PORT} já está em uso.`);
    console.error(`    Rode em outra porta:  PORT=5801 node server.mjs\n`);
  } else {
    console.error("\n  ✗ Erro ao iniciar o servidor:", e.message, "\n");
  }
  process.exit(1);
});

// Checagem de pré-requisitos antes de subir.
access(HTML_PATH).then(
  () => {
    server.listen(PORT, () => {
      console.log(`\n  🎬 Roteirista IA rodando!  (Node ${process.version})`);
      console.log(`\n  Abra no navegador:  http://localhost:${PORT}`);
      console.log(`  (NÃO abra o .html com duplo-clique — use o endereço acima.)\n`);
      console.log("  Cole sua chave aal_... em ⚙️ Configuração da IA e gere o roteiro.");
      console.log("  Os logs das chamadas aparecerão aqui embaixo:\n");
    });
  },
  () => {
    console.error("\n  ✗ Não encontrei 'roteirista-ia.html' nesta pasta:");
    console.error("    " + __dirname);
    console.error("    Coloque roteirista-ia.html e server.mjs na MESMA pasta e rode de novo.\n");
    process.exit(1);
  }
);
