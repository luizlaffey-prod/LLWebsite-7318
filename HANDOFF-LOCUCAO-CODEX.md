# Handoff — Finalizar a Locução (voice-links) do AURA em produção

> **Objetivo:** publicar o endpoint de locução do AURA em produção para que a
> **locução automática do StudioPro AI Lab** volte a funcionar de ponta a ponta.
>
> **Resumo em uma frase:** o código da locução já está **pronto, testado e
> commitado**; falta apenas **fazer o deploy em produção** (decisão de branch +
> Vercel) — nada precisa mudar no app StudioPro.

---

## 1. Diagnóstico (confirmado)

A locução automática do StudioPro chama:

```
POST /api/v1/stations/{stationId}/voice-links/draft
```

Em **produção (`https://www.aurapress.app`)** esse endpoint responde **HTTP 404 com
`content-type: text/html`** (a página 404 do Next.js). O StudioPro interpreta
"404 + HTML" como *endpoint não publicado* e mostra:

> "AURA respondeu com HTTP 404: endpoint_not_available. Esta função ainda não
> está publicada no servidor AURA configurado."

Evidências coletadas:
- `POST www.aurapress.app/api/v1/device` → **405** (a API base funciona).
- `POST www.aurapress.app/api/v1/stations/test/voice-links/draft` → **404 text/html**
  (a rota de locução **não está** no build de produção atual).
- O StudioPro aponta para produção por padrão (não há flag
  `VITE_STUDIOPRO_EXPERIMENTAL_WINDOW=preview-test`), então a URL de preview no
  `.env.local` do app é **inerte** — o app sempre fala com `www.aurapress.app`.

**Conclusão:** o app está correto. A rota existe no código deste repositório, mas
**não está publicada em produção**.

---

## 2. O que já foi feito

- A rota `voice-links/draft` está **implementada e completa**:
  - `aura/app/api/v1/stations/[stationId]/voice-links/draft/route.ts`
  - `aura/lib/llm/voice-link-generator.ts` (gerador; trata faixa sem artista,
    "verified facts", slogans phrase-first)
  - `aura/lib/integration/contracts.ts` (adiciona `VerifiedTrackFact`, `artist`
    opcional)
- **Testes passando:** 21 (`voice-link-generator.test.ts` + `contracts.test.ts`).
- **Commit:** `e0b7213` — *"feat(aura): finalize voice-link draft endpoint with
  verified facts"*.
- **Branch:** `codex/aura-ai-voice-link` — **já com push** para o remote `handoff`
  (`github.com/luizlaffey-prod/LLWebsite-7318`).
- **Sem migração de banco:** a mudança em `aura/lib/db/schema.ts` foi apenas
  tornar `artist` **opcional** (tipo), não há alteração de coluna.

---

## 3. O que falta finalizar (checklist para o Codex)

- [ ] **Confirmar a branch de produção da Vercel**
      (Vercel → projeto do aurapress → Settings → Git → *Production Branch*).
      Descobrir de qual branch `www.aurapress.app` faz deploy.
- [ ] **Levar a `codex/aura-ai-voice-link` para produção.**
      - ⚠️ **Atenção:** a `main` está **~184 commits atrás** dessa branch
        (364 arquivos de diferença). Mergear a branch inteira na `main` sobe
        **muito mais** do que a locução. Avaliar:
        - o caminho seguro (merge completo é intencional? ou um caminho mais
          cirúrgico — cherry-pick só dos commits da locução para a branch de
          produção?);
        - impacto no site comercial ao vivo (pagamentos Stripe/PayPal, banco,
          e-mail, storage).
      - PR já comparável:
        `github.com/luizlaffey-prod/LLWebsite-7318/compare/main...codex/aura-ai-voice-link`
- [ ] **Confirmar as env vars de produção** no projeto Vercel (ver
      `aura/.env.example`). As essenciais para a locução:
      `DATABASE_URL`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `ELEVENLABS_API_KEY`
      (além de auth/licensing já existentes).
- [ ] **Publicar** (deploy de produção via merge na branch de produção ou
      *Promote to Production* na Vercel).
- [ ] **Validar em produção:**
      ```
      POST https://www.aurapress.app/api/v1/stations/{stationId}/voice-links/draft
      ```
      Deve responder **JSON** (ex.: `401` sem bearer, `400` com body inválido, ou
      `200` com `{ draft }`) — **nunca** mais `404 text/html`.

---

## 4. Detalhes técnicos úteis

**Contrato do endpoint** (o que o StudioPro envia):
- Método: `POST`
- Corpo (JSON): `mode: "between_songs"`, `currentTrack {title, artist?}`,
  `nextTracks [{title, artist?}]`, `language`, `tone`, `maxDurationSeconds`,
  `customInstruction?`, `factMode?`, `verifiedFact?`.
- Auth: `Bearer <access_token>` do dispositivo pareado.
- Resposta esperada: `{ draft: {...} }`.

**Lado StudioPro (NÃO precisa mudar):**
- Chamada: `studiopro-ai-lab/src-tauri/src/aura.rs` (~linha 1501,
  `/api/v1/stations/{}/voice-links/draft`).
- Detecção do erro: `aura.rs` `api_error_message` (~linha 905) — "HTML + 404" vira
  a mensagem `endpoint_not_available`. Ou seja, assim que produção responder JSON,
  o app para de acusar o erro sozinho.

**Repositórios:**
- Backend AURA: `aurapress-ai-voice-link` (este repo) — remote `handoff`.
- App StudioPro: `studiopro-ai-lab` (Tauri). Já está em alpha.14, correto.

---

## 5. Como confirmar que funcionou (teste de ponta a ponta)

No **StudioPro AI Lab** (com o AURA conectado):
1. Deixar a programação tocando com a automação de locução ativa.
2. Ao atingir a cadência (a cada N músicas / minutos), o app deve **gerar** a
   locução e **inserir** na fila uma entrada **"Locução IA entre músicas"**.
3. Não deve mais aparecer o aviso `endpoint_not_available` no painel
   "Problemas e saúde".

---

_Preparado como handoff. O trabalho de código está concluído neste repo; resta
apenas o deploy/produção, que exige acesso ao painel Vercel e decisões de branch._
