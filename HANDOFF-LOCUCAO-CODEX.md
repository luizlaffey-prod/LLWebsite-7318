# Handoff — Locução do AURA: último passo (cota)

> **Status:** o deploy do endpoint **já foi feito e está funcionando**. Falta
> **um único passo**: liberar a cota de geração da conta operadora.
>
> **➡️ AÇÃO PARA O CODEX:** executar a seção **3. TAREFA PARA O CODEX EXECUTAR**.
> O operador autorizou. Nada mais precisa ser alterado no código — nem do backend
> AURA, nem do StudioPro AI Lab.

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

## 3. TAREFA PARA O CODEX EXECUTAR — liberar a cota

> O operador autorizou o Codex a executar este passo sozinho.

### 3.1. Descobrir o e-mail da conta operadora

Não invente o e-mail. Use uma destas fontes, nesta ordem:

1. O valor já configurado em `ADMIN_EMAILS` na produção da Vercel (é a conta do
   dono do projeto):
   ```bash
   vercel env pull .env.vercel.production --environment=production
   grep '^ADMIN_EMAILS=' .env.vercel.production
   ```
2. Ou consultar a conta da estação no banco (tabela `user`, coluna `email`) — é o
   `billingUserId` da organização que aparece em `getQuota()`.

Se houver mais de um e-mail em `ADMIN_EMAILS`, inclua todos (o operador é um
deles) — a variável aceita lista separada por vírgula.

### 3.2. Definir a variável em produção

```bash
# valor: e-mail(s) do passo 3.1, separados por vírgula, sem espaços
vercel env add UNMETERED_GENERATION_EMAILS production
```

Se a variável já existir com valor errado/vazio, remova e recrie:

```bash
vercel env rm UNMETERED_GENERATION_EMAILS production
vercel env add UNMETERED_GENERATION_EMAILS production
```

⚠️ Não remova nem altere `ADMIN_EMAILS` — são variáveis diferentes e ambas devem
existir.

### 3.3. Redeploy da produção

```bash
vercel --prod
```

(ou "Redeploy" no painel do deployment de produção)

### 3.4. Validar (obrigatório)

1. O endpoint continua respondendo JSON:
   ```bash
   curl -sS -o /dev/null -w "%{http_code} %{content_type}\n" -X POST \
     "https://www.aurapress.app/api/v1/stations/test/voice-links/draft" \
     -H "Content-Type: application/json" -d '{}'
   # esperado: 400 application/json  (nunca 404 text/html)
   ```
2. No StudioPro AI Lab, com a rádio tocando e a automação de locução ativa:
   - a locução deve entrar na fila como **"Locução IA entre músicas"**;
   - o painel **"Problemas e saúde"** **não** pode mais mostrar
     `cota diária de geração do AURA foi esgotada`.
3. Se ainda aparecer `quota_exceeded`, confira se o e-mail usado é exatamente o
   da conta que está pareada com a estação (comparação é `toLowerCase()`, então
   maiúsculas não importam, mas o endereço precisa ser idêntico).

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
