# Handoff — Locução do AURA: último passo (cota)

> **Status:** o deploy do endpoint **já foi feito e está funcionando**. Falta
> **um único passo**: liberar a cota de geração da conta operadora.

---

## 1. O que já está resolvido ✅

- **Endpoint publicado em produção.** `POST /api/v1/stations/{stationId}/voice-links/draft`
  em `https://www.aurapress.app` responde **JSON** (ex.: `400 invalid_station_id`
  para entrada inválida). Antes respondia `404 text/html`.
- **Código da locução** commitado e no GitHub (branch `codex/aura-ai-voice-link`,
  commit `e0b7213`), com 21 testes passando.
- **App StudioPro AI Lab**: conectado ao AURA, cadência de locução disparando,
  fila correta. Verificado por instrumentação em runtime.

---

## 2. O que ainda bloqueia ⛔ — cota diária esgotada

O app recebe do AURA:

```
O AURA não conseguiu concluir locução: quota_exceeded
```

Origem (`aura/lib/integration/content-requests.ts`):

```ts
const quota = await getQuota(billingUserId);
if (!quota.unlimited && quota.remaining <= 0) {
  throw new ContentProcessingError('quota_exceeded');
}
```

### Por que esgota tão rápido

Limites **por dia** (`aura/lib/billing/plans.ts`):

| Plano | Gerações/dia |
|---|---|
| starter | 5 |
| standard | 10 |
| pro | 20 |
| trial | 10 |

**Locuções e boletins consomem o mesmo contador diário** (`bulletinsUsed`). Uma
rádio com locução a cada 2–3 músicas esgota até o limite Pro (20) em menos de
uma hora. A cota foi desenhada para boletins ocasionais, não para locução
contínua.

### ⚠️ Ser admin NÃO dá cota ilimitada

São duas variáveis independentes:

| Variável | Efeito |
|---|---|
| `ADMIN_EMAILS` | Acesso a rotas de admin (`/api/admin/*`) e health checks. **Nenhum efeito na cota.** |
| `UNMETERED_GENERATION_EMAILS` | **A única** que define `unlimited: true` em `getQuota()` |

Referência (`aura/lib/billing/quota.ts`):

```ts
unlimited:
  Boolean(dbUser?.email) &&
  unmeteredGenerationEmails().has(dbUser!.email.toLowerCase()),
```

---

## 3. O passo que falta (Vercel)

- [ ] Vercel → projeto do aurapress → **Settings → Environment Variables → Production**
- [ ] `UNMETERED_GENERATION_EMAILS` = e-mail da conta AURA do operador
      (separar por vírgula se houver mais de um)
- [ ] **Redeploy** da produção
- [ ] Validar: gerar uma locução pelo StudioPro e confirmar que não aparece mais
      `quota_exceeded` no painel "Problemas e saúde"

**Alternativas** (não recomendadas para operação contínua): esperar o reset
diário (esgota de novo) ou subir de plano (Pro ainda é só 20/dia).

---

## 4. Correção já aplicada no app (não precisa refazer)

O StudioPro tratava `quota_exceeded` como **falha definitiva** e suspendia o
locutor automático até o app ser reiniciado — mesmo depois de a cota voltar.
Corrigido em `src/lib/auraRequestPolicy.ts`:

- cota agora é **condição temporária** (`quota: true`, nunca `blocked`);
- nova tentativa automática a cada **30 min** (`AURA_QUOTA_RETRY_DELAY_MS`), então
  o locutor **se recupera sozinho** quando a cota volta;
- enquanto esgotada, não martela a API (bloqueio vale para a conta toda);
- mensagem clara no painel: *"a cota diária de geração do AURA foi esgotada"*.

Testes: `src/lib/auraRequestPolicy.test.ts` — *"cota esgotada nunca bloqueia em
definitivo e volta a tentar depois"*.

---

_Resumo: código pronto, deploy pronto, app pronto. Falta só liberar a cota._
