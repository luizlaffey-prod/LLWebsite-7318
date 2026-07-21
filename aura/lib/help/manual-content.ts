import type { Locale } from '@/i18n';

/**
 * User-manual content, per locale. Kept here (rather than in the giant
 * messages/*.json files) because each section is rich multi-paragraph
 * HTML — awkward to author and diff inside flat i18n JSON. The HTML is
 * fully static/trusted (no user input), so the /help page renders it
 * with dangerouslySetInnerHTML inside a `.manual-prose` wrapper whose
 * typography lives in globals.css.
 */

export interface ManualSection {
  id: string;
  title: string;
  html: string;
}

export interface ManualStrings {
  eyebrow: string;
  h1a: string;
  h1b: string;
  lede: string;
  tocTitle: string;
  sections: ManualSection[];
}

const en: ManualStrings = {
  eyebrow: 'Automated Urban Radio Audio',
  h1a: 'AI-voiced news bulletins,',
  h1b: 'ready for air in seconds.',
  lede: 'Everything you need — from your first bulletin to fully automated, hands-off broadcasting. No technical background required.',
  tocTitle: 'Contents',
  sections: [
    {
      id: 'what',
      title: 'What AURA Does',
      html: `<p>AURA turns the day's news into a finished, air-ready radio bulletin in about <strong>30 seconds</strong>. It:</p>
<ol class="steps"><li><strong>Searches</strong> trusted news sources worldwide — filtered by topic, political slant, and location.</li><li><strong>Writes</strong> a natural-sounding radio script with emotional pacing.</li><li><strong>Narrates</strong> it in a broadcast-quality AI voice.</li><li><strong>Mixes</strong> in a background music bed (optional) that ducks under the voice.</li><li><strong>Delivers</strong> a ready MP3 (or WAV) you can drop straight into your playout.</li></ol>
<p>Do it <strong>on demand</strong> whenever you want, or set up <strong>automations</strong> that generate and deliver bulletins on a schedule — even overnight, with nobody at the console.</p>`,
    },
    {
      id: 'start',
      title: 'Getting Started',
      html: `<h3>Create your account</h3><ol class="steps"><li>Go to aurapress.app and click <strong>Start free</strong>.</li><li>Enter your <strong>station name</strong>, <strong>email</strong>, and a <strong>password</strong>.</li><li>You're in — no credit card required.</li></ol>
<h3>Your free trial</h3><p>Every new account starts with a <strong>14-day Pro trial</strong>. You get <strong>every Pro feature</strong> (custom voices, WAV export, automations) with a limit of <strong>10 bulletins per day</strong>. When the trial ends you simply choose a plan — you're only charged if you subscribe.</p>
<h3>Choose your language</h3><p>AURA works in <strong>English, Portuguese, and Spanish</strong>. Set at signup, changeable anytime with the language switcher in the app header. This also controls the language your bulletins are written and voiced in.</p>`,
    },
    {
      id: 'first',
      title: 'Your First Bulletin',
      html: `<p>The fastest way to make a bulletin right now, from <strong>News Search</strong>:</p>
<ol class="steps"><li><strong>Set your options.</strong> Categories (Politics, Economy, Technology, Sports, Health, Culture, Music, Cinema, Arts — combine several); Bias (Left, Center, Right); Geographic scope — Global (worldwide, translated) or Country (type any country in Location; a city or region works too, as a keyword); Duration in seconds; Output language; and optionally Include weather.</li><li>Click <strong>Search</strong>. AURA gathers the latest matching stories.</li><li>Click <strong>Generate</strong>. AURA writes, narrates, and (if you chose music) mixes it. Saved automatically to <strong>My Audios</strong>.</li></ol>
<div class="callout tip"><span class="ic">✦</span><p>The bulletin opens straight with the news — no "Good morning" filler — so it sounds like it's dropping into a live broadcast. That's intentional, since a bulletin might air at any time of day.</p></div>`,
    },
    {
      id: 'audios',
      title: 'My Audios — Your Library',
      html: `<p>Every bulletin you generate lives here.</p>
<h3>Play</h3><p>Click play to listen right in your browser.</p>
<h3>Edit the script &amp; re-generate</h3><p>Click <strong>Edit</strong> to open the script editor. The bulletin is broken into <strong>blocks</strong> (one per story). You can edit a block's text or <strong>delete</strong> a block entirely — for example, to remove a story you don't like (the trash icon appears on hover). Then click <strong>Regenerate audio</strong>; AURA re-voices it with your changes. A yellow reminder shows when you have unsaved edits.</p>
<h3>Download</h3><ul><li><strong>MP3</strong> — the standard format, works everywhere.</li><li><strong>WAV</strong> — lossless, higher quality (Pro only). Look for the WAV button next to MP3.</li></ul>
<h3>Save to a local folder</h3><p>Connect AURA to a folder on your computer so downloads (and automated bulletins) drop straight in — handy for feeding your playout. Set it once and AURA remembers.</p>`,
    },
    {
      id: 'voices',
      title: 'My Voices',
      html: `<h3>Choosing a voice</h3><p>Browse the catalog, click <strong>Preview</strong> to hear a sample, and <strong>Use</strong> to set your default. Your default voice is used for new bulletins.</p>
<h3>Speed</h3><p>Use the <strong>Default speed</strong> slider to make the voice read faster or slower.</p>
<h3>Cloning your own voice (Pro)</h3><p>Create a custom voice — for example, your station's own announcer:</p>
<ol class="steps"><li>Open the cloning section in My Voices.</li><li>Upload <strong>1–5 clean samples</strong> (30–60 seconds each).</li><li>Give it a name.</li><li>AURA creates the voice. It appears at the top with a <strong>Cloned</strong> badge.</li></ol>
<p>Rename cloned voices anytime with the pencil icon.</p>
<div class="callout tip"><span class="ic">✦</span><p><strong>Pronunciation:</strong> AI voices can occasionally mispronounce regional sounds (like a strong "R"). If accuracy matters for your market, a cloned voice of a native announcer is the best fix.</p></div>`,
    },
    {
      id: 'autos',
      title: 'Automations — Set It & Forget It',
      html: `<p>Automations are the heart of hands-off broadcasting. You define <strong>when</strong> and <strong>what</strong>; AURA generates and delivers automatically.</p>
<div class="callout tip"><span class="ic">✦</span><p>Automations require the <strong>Standard</strong> or <strong>Pro</strong> plan. Choosing specific weekdays is Pro.</p></div>
<h3>Create an automation</h3>
<ol class="steps"><li>Go to <strong>Automations → New</strong>, and <strong>name</strong> it (e.g. "Morning News").</li><li><strong>Add time slots.</strong> Each slot is a scheduled bulletin. Per slot: Time (07:00, 12:00…), Categories for that slot, and Days of week (Pro).</li><li>Set the shared options: language, voice, bias, scope, duration, speed, timezone, plus optional weather and background track.</li><li><strong>Lead time</strong> — minutes before each slot that AURA starts preparing (5–120). Lower = freshest news; higher = more buffer so the file is ready well before air. Default 60.</li><li>Toggle <strong>Enabled</strong> and <strong>Save</strong>.</li></ol>
<h3>Weather-only bulletins</h3><p>Create a slot with <strong>no news categories</strong> and weather on — it produces a weather-only forecast update.</p>
<h3>Watching runs</h3><p>Each automation keeps a <strong>history</strong> of every run: which slot fired, when, success or failure (with the reason), and the finished audio. Use <strong>Run now</strong> to test a slot immediately.</p>`,
    },
    {
      id: 'music',
      title: 'Background Music',
      html: `<h3>Upload your own</h3><p>Pick an audio file from your computer. AURA mixes it under the voice automatically. Nothing is shared publicly.</p>
<h3>Generate with AI (Pro)</h3><p>AURA creates a custom instrumental bed tailored to the bulletin's mood and length. Each Pro plan includes a monthly allowance of AI tracks.</p>
<h3>Interactive ducking</h3><p>However you add music, AURA does <strong>smart ducking</strong>: the bed sits low under the voice, rises during pauses between stories, and dips back down just before the voice returns — the natural "breathing" of professional radio.</p>`,
    },
    {
      id: 'weather',
      title: 'Weather',
      html: `<p>To add a forecast to any bulletin:</p>
<ol class="steps"><li>Turn on <strong>Include weather</strong>.</li><li>Enter the <strong>weather city</strong> (e.g. Miami, FL or São Paulo). Use a specific city — a whole country won't work for weather.</li><li>Choose the <strong>format</strong>: Separate block (a forecast at the end) or Integrated (woven into the news).</li></ol>
<p>Include <strong>multiple cities</strong> by separating with a comma or "and" (e.g. São Paulo and Campinas). AURA reports each one.</p>`,
    },
    {
      id: 'delivery',
      title: 'Delivery Destinations',
      html: `<p>Beyond downloading, AURA can send finished bulletins wherever you need. Set these up in <strong>Settings → Delivery</strong>:</p>
<ul><li><strong>FTP</strong> — upload to your station's server.</li><li><strong>Webhook (HTTP)</strong> — POST the audio to any system you run.</li><li><strong>Email</strong> — send the bulletin to an inbox.</li><li><strong>Local folder</strong> — while an AURA tab is open, bulletins sync into a folder on your computer.</li><li><strong>RSS feed</strong> — a private podcast-style feed URL any RSS system can pull automatically.</li></ul>
<p>Automated bulletins are delivered to your destinations right after they're generated. (Number and type depend on your plan.)</p>`,
    },
    {
      id: 'settings',
      title: 'Settings',
      html: `<h3>Billing</h3><p>See your plan, switch plans, and manage your subscription. Upgrades take effect immediately; manage or cancel anytime through the secure billing portal.</p>
<h3>Brand (Pro — White Label)</h3><p>Add your <strong>station logo</strong> and <strong>accent color</strong> so the app reflects your brand instead of AURA's.</p>
<h3>Delivery</h3><p>Configure your delivery destinations (see above).</p>
<h3>Health</h3><p>A live status page showing whether each part of the system (news, voice, weather, storage, email…) is connected and working. Handy if something's off.</p>`,
    },
    {
      id: 'plans',
      title: 'Plans & Limits',
      html: `<div class="table-wrap"><table>
<thead><tr><th>Feature</th><th>Starter</th><th>Standard</th><th class="plan-pro">Pro</th></tr></thead>
<tbody>
<tr><td>Price / month</td><td>$19.99</td><td>$59.99</td><td class="plan-pro">$129.99</td></tr>
<tr><td>Bulletins / day</td><td>5</td><td>10</td><td class="plan-pro">20</td></tr>
<tr><td>Max duration</td><td>60s</td><td>120s</td><td class="plan-pro">180s</td></tr>
<tr><td>Voices</td><td>1 preset</td><td>Multiple presets</td><td class="plan-pro">Full catalog + cloning</td></tr>
<tr><td>Formats</td><td>MP3</td><td>MP3 + WAV</td><td class="plan-pro">MP3 + WAV</td></tr>
<tr><td>Automation</td><td>—</td><td>Simple (daily)</td><td class="plan-pro">Full + per-weekday</td></tr>
<tr><td>AI music beds</td><td>—</td><td>—</td><td class="plan-pro">Monthly allowance</td></tr>
<tr><td>Delivery</td><td>Download</td><td>Limited</td><td class="plan-pro">Unlimited</td></tr>
<tr><td>White label</td><td>—</td><td>—</td><td class="plan-pro">Yes</td></tr>
<tr><td>Support</td><td>Email</td><td>Email + chat</td><td class="plan-pro">Priority email</td></tr>
</tbody></table></div>
<p>Your <strong>14-day trial</strong> gives you Pro features with a 10-bulletins-per-day limit.</p>`,
    },
    {
      id: 'trouble',
      title: 'Tips & Troubleshooting',
      html: `<h3>The bulletin says the wrong date</h3><p>AURA uses your account's <strong>timezone</strong> to know today's date. Make sure it's set correctly in your automation or account settings.</p>
<h3>Weather didn't show up</h3><p>Use a <strong>specific city</strong> (not a country) and make sure <strong>Include weather</strong> is on. For two cities, separate with a comma or "and".</p>
<h3>My automation only made one of several slots</h3><p>Open the automation's <strong>history</strong> to see each slot's status and any error. Slots generate a few minutes apart — give it time and refresh My Audios.</p>
<h3>A news search returned nothing</h3><p>Very narrow combinations (a specific bias + a small country + an unusual category) may have little coverage. Broaden the categories, switch to <strong>Global</strong> scope, or change the bias.</p>
<h3>The times in My Audios look odd</h3><p>A number like <code>1m03</code> is the bulletin's <strong>length</strong> (1 min 3 sec), not a clock time. The date shows when it was created.</p>`,
    },
    {
      id: 'help',
      title: 'Getting Help',
      html: `<ul><li><strong>AURA Assistant</strong> (Standard &amp; Pro): a chat helper inside the app — click the chat button to ask questions about using AURA.</li><li><strong>Send feedback</strong>: use the menu item to report a bug, request a feature, or tell us what's working. It goes straight to the team, and we reply at the email on your account.</li></ul>
<div class="callout tip"><span class="ic">✦</span><p>Thanks for using AURA. Now go make some great radio.</p></div>`,
    },
  ],
};

const pt: ManualStrings = {
  eyebrow: 'Áudio de Rádio Urbano Automatizado',
  h1a: 'Boletins com voz de IA,',
  h1b: 'prontos pro ar em segundos.',
  lede: 'Tudo o que você precisa — do primeiro boletim à transmissão totalmente automática, sem precisar de ninguém no controle. Sem conhecimento técnico.',
  tocTitle: 'Índice',
  sections: [
    {
      id: 'what',
      title: 'O que a AURA faz',
      html: `<p>A AURA transforma as notícias do dia num boletim de rádio pronto pro ar em cerca de <strong>30 segundos</strong>. Ela:</p>
<ol class="steps"><li><strong>Busca</strong> fontes confiáveis do mundo todo — filtradas por tema, viés político e localização.</li><li><strong>Escreve</strong> um roteiro de rádio natural, com ritmo e emoção.</li><li><strong>Narra</strong> com uma voz de IA de qualidade broadcast.</li><li><strong>Mixa</strong> uma trilha de fundo (opcional) que abaixa sob a voz.</li><li><strong>Entrega</strong> um MP3 (ou WAV) pronto pra jogar direto no seu playout.</li></ol>
<p>Faça <strong>na hora</strong> quando quiser, ou configure <strong>automações</strong> que geram e entregam boletins num horário — até de madrugada, sem ninguém no controle.</p>`,
    },
    {
      id: 'start',
      title: 'Primeiros Passos',
      html: `<h3>Crie sua conta</h3><ol class="steps"><li>Acesse aurapress.app e clique em <strong>Start free</strong>.</li><li>Informe o <strong>nome da rádio</strong>, o <strong>email</strong> e uma <strong>senha</strong>.</li><li>Pronto — sem cartão de crédito.</li></ol>
<h3>Seu período grátis</h3><p>Toda conta nova começa com <strong>14 dias de Pro grátis</strong>. Você tem <strong>todos os recursos Pro</strong> (vozes personalizadas, WAV, automações) com limite de <strong>10 boletins por dia</strong>. Ao fim do período, é só escolher um plano — você só é cobrado se assinar.</p>
<h3>Escolha o idioma</h3><p>A AURA funciona em <strong>inglês, português e espanhol</strong>. Definido no cadastro e alterável a qualquer momento pelo seletor de idioma no topo. Isso também controla o idioma em que os boletins são escritos e narrados.</p>`,
    },
    {
      id: 'first',
      title: 'Seu Primeiro Boletim',
      html: `<p>O jeito mais rápido de fazer um boletim agora, a partir do <strong>News Search</strong>:</p>
<ol class="steps"><li><strong>Defina as opções.</strong> Categorias (Política, Economia, Tecnologia, Esportes, Saúde, Cultura, Música, Cinema, Artes — combine várias); Viés (Esquerda, Centro, Direita); Escopo geográfico — Global (mundo todo, traduzido) ou País (digite qualquer país em Location; cidade ou região também funciona, como palavra-chave); Duração em segundos; Idioma de saída; e, opcionalmente, Include weather.</li><li>Clique em <strong>Search</strong>. A AURA reúne as matérias mais recentes.</li><li>Clique em <strong>Generate</strong>. A AURA escreve, narra e (se escolheu trilha) mixa. Salvo automaticamente em <strong>My Audios</strong>.</li></ol>
<div class="callout tip"><span class="ic">✦</span><p>O boletim já abre com a notícia — sem "Bom dia" — pra soar como se entrasse no meio de uma transmissão ao vivo. É de propósito, já que ele pode ir ao ar em qualquer horário.</p></div>`,
    },
    {
      id: 'audios',
      title: 'My Audios — Sua Biblioteca',
      html: `<p>Todo boletim que você gera fica aqui.</p>
<h3>Ouvir</h3><p>Clique em play pra ouvir no navegador.</p>
<h3>Editar o roteiro e regerar</h3><p>Clique em <strong>Edit</strong> pra abrir o editor. O boletim é dividido em <strong>blocos</strong> (um por matéria). Você pode editar o texto de um bloco ou <strong>excluir</strong> um bloco inteiro — por exemplo, pra tirar uma notícia que não curtiu (o ícone de lixeira aparece ao passar o mouse). Depois clique em <strong>Regenerate audio</strong>; a AURA regrava com suas mudanças. Um aviso amarelo aparece quando há edições não salvas.</p>
<h3>Baixar</h3><ul><li><strong>MP3</strong> — formato padrão, funciona em tudo.</li><li><strong>WAV</strong> — sem perda, mais qualidade (só Pro). Procure o botão WAV ao lado do MP3.</li></ul>
<h3>Salvar numa pasta local</h3><p>Conecte a AURA a uma pasta do seu computador pra que os downloads (e boletins automáticos) caiam direto nela — ótimo pra alimentar o playout. Configure uma vez e a AURA lembra.</p>`,
    },
    {
      id: 'voices',
      title: 'My Voices',
      html: `<h3>Escolher a voz</h3><p>Navegue no catálogo, clique em <strong>Preview</strong> pra ouvir e <strong>Use</strong> pra definir como padrão. A voz padrão é usada nos novos boletins.</p>
<h3>Velocidade</h3><p>Use o controle <strong>Default speed</strong> pra deixar a voz mais rápida ou mais lenta.</p>
<h3>Clonar sua própria voz (Pro)</h3><p>Crie uma voz personalizada — por exemplo, o locutor da sua rádio:</p>
<ol class="steps"><li>Abra a seção de clonagem em My Voices.</li><li>Envie <strong>1–5 amostras limpas</strong> (30–60 segundos cada).</li><li>Dê um nome.</li><li>A AURA cria a voz. Ela aparece no topo com o selo <strong>Clonada</strong>.</li></ol>
<p>Renomeie vozes clonadas quando quiser no ícone de lápis.</p>
<div class="callout tip"><span class="ic">✦</span><p><strong>Pronúncia:</strong> vozes de IA às vezes erram sons regionais (como um "R" forte). Se a precisão importa pro seu mercado, uma voz clonada de um locutor nativo é a melhor solução.</p></div>`,
    },
    {
      id: 'autos',
      title: 'Automações — Configure e Esqueça',
      html: `<p>As automações são o coração da transmissão sem intervenção. Você define <strong>quando</strong> e <strong>o quê</strong>; a AURA gera e entrega sozinha.</p>
<div class="callout tip"><span class="ic">✦</span><p>Automações exigem o plano <strong>Standard</strong> ou <strong>Pro</strong>. Escolher dias específicos da semana é Pro.</p></div>
<h3>Criar uma automação</h3>
<ol class="steps"><li>Vá em <strong>Automations → New</strong> e dê um <strong>nome</strong> (ex.: "Notícias da Manhã").</li><li><strong>Adicione horários (slots).</strong> Cada slot é um boletim agendado. Por slot: Horário (07:00, 12:00…), Categorias daquele slot e Dias da semana (Pro).</li><li>Defina as opções gerais: idioma, voz, viés, escopo, duração, velocidade, fuso, além de clima e trilha opcionais.</li><li><strong>Antecedência (lead time)</strong> — minutos antes de cada slot em que a AURA começa a preparar (5–120). Menos = notícia mais fresca; mais = folga pra o arquivo ficar pronto bem antes do ar. Padrão 60.</li><li>Ative <strong>Enabled</strong> e clique em <strong>Save</strong>.</li></ol>
<h3>Boletins só de clima</h3><p>Crie um slot <strong>sem categorias de notícia</strong> e com clima ligado — ele gera só a previsão do tempo.</p>
<h3>Acompanhar as execuções</h3><p>Cada automação guarda um <strong>histórico</strong> de toda execução: qual slot rodou, quando, sucesso ou falha (com o motivo) e o áudio gerado. Use <strong>Run now</strong> pra testar um slot na hora.</p>`,
    },
    {
      id: 'music',
      title: 'Trilha de Fundo',
      html: `<h3>Enviar a sua</h3><p>Escolha um arquivo de áudio do computador. A AURA mixa sob a voz automaticamente. Nada é compartilhado publicamente.</p>
<h3>Gerar com IA (Pro)</h3><p>A AURA cria uma trilha instrumental sob medida pra emoção e duração do boletim. Cada plano Pro inclui uma cota mensal de trilhas de IA.</p>
<h3>Ducking interativo</h3><p>Seja qual for a forma, a AURA faz <strong>ducking inteligente</strong>: a trilha fica baixa sob a voz, sobe nas pausas entre matérias e desce logo antes da voz voltar — a "respiração" natural do rádio profissional.</p>`,
    },
    {
      id: 'weather',
      title: 'Previsão do Tempo',
      html: `<p>Pra adicionar previsão a qualquer boletim:</p>
<ol class="steps"><li>Ligue <strong>Include weather</strong>.</li><li>Informe a <strong>cidade do clima</strong> (ex.: São Paulo ou Miami, FL). Use uma cidade específica — um país inteiro não funciona pra clima.</li><li>Escolha o <strong>formato</strong>: Bloco separado (previsão no fim) ou Integrado (dentro das notícias).</li></ol>
<p>Inclua <strong>várias cidades</strong> separando por vírgula ou "e" (ex.: São Paulo e Campinas). A AURA fala cada uma.</p>`,
    },
    {
      id: 'delivery',
      title: 'Destinos de Entrega',
      html: `<p>Além de baixar, a AURA pode enviar os boletins prontos pra onde você precisar. Configure em <strong>Settings → Delivery</strong>:</p>
<ul><li><strong>FTP</strong> — enviar pro servidor da sua rádio.</li><li><strong>Webhook (HTTP)</strong> — POST do áudio pra qualquer sistema seu.</li><li><strong>Email</strong> — mandar o boletim pra uma caixa de entrada.</li><li><strong>Pasta local</strong> — com uma aba da AURA aberta, os boletins sincronizam numa pasta do seu computador.</li><li><strong>Feed RSS</strong> — uma URL privada estilo podcast que qualquer sistema de RSS puxa automaticamente.</li></ul>
<p>Boletins automáticos são entregues nos seus destinos logo após serem gerados. (Quantidade e tipo dependem do plano.)</p>`,
    },
    {
      id: 'settings',
      title: 'Configurações',
      html: `<h3>Cobrança</h3><p>Veja seu plano, troque de plano e gerencie a assinatura. Upgrades valem na hora; gerencie ou cancele quando quiser pelo portal seguro de cobrança.</p>
<h3>Marca (Pro — White Label)</h3><p>Adicione o <strong>logo da sua rádio</strong> e a <strong>cor de destaque</strong> pra o app refletir sua marca no lugar da AURA.</p>
<h3>Entrega</h3><p>Configure seus destinos de entrega (veja acima).</p>
<h3>Saúde</h3><p>Uma página de status ao vivo mostrando se cada parte do sistema (notícias, voz, clima, armazenamento, email…) está conectada e funcionando. Útil se algo estiver estranho.</p>`,
    },
    {
      id: 'plans',
      title: 'Planos e Limites',
      html: `<div class="table-wrap"><table>
<thead><tr><th>Recurso</th><th>Starter</th><th>Standard</th><th class="plan-pro">Pro</th></tr></thead>
<tbody>
<tr><td>Preço / mês</td><td>$19.99</td><td>$59.99</td><td class="plan-pro">$129.99</td></tr>
<tr><td>Boletins / dia</td><td>5</td><td>10</td><td class="plan-pro">20</td></tr>
<tr><td>Duração máxima</td><td>60s</td><td>120s</td><td class="plan-pro">180s</td></tr>
<tr><td>Vozes</td><td>1 preset</td><td>Vários presets</td><td class="plan-pro">Catálogo completo + clonagem</td></tr>
<tr><td>Formatos</td><td>MP3</td><td>MP3 + WAV</td><td class="plan-pro">MP3 + WAV</td></tr>
<tr><td>Automação</td><td>—</td><td>Simples (diária)</td><td class="plan-pro">Completa + por dia da semana</td></tr>
<tr><td>Trilhas de IA</td><td>—</td><td>—</td><td class="plan-pro">Cota mensal</td></tr>
<tr><td>Entrega</td><td>Download</td><td>Limitada</td><td class="plan-pro">Ilimitada</td></tr>
<tr><td>White label</td><td>—</td><td>—</td><td class="plan-pro">Sim</td></tr>
<tr><td>Suporte</td><td>Email</td><td>Email + chat</td><td class="plan-pro">E-mail prioritário</td></tr>
</tbody></table></div>
<p>Seu <strong>trial de 14 dias</strong> dá recursos Pro com limite de 10 boletins por dia.</p>`,
    },
    {
      id: 'trouble',
      title: 'Dicas e Solução de Problemas',
      html: `<h3>O boletim mostra a data errada</h3><p>A AURA usa o <strong>fuso horário</strong> da sua conta pra saber a data de hoje. Confira se está certo na automação ou nas configurações da conta.</p>
<h3>A previsão do tempo não apareceu</h3><p>Use uma <strong>cidade específica</strong> (não um país) e confira se <strong>Include weather</strong> está ligado. Pra duas cidades, separe por vírgula ou "e".</p>
<h3>Minha automação só gerou um de vários slots</h3><p>Abra o <strong>histórico</strong> da automação pra ver o status de cada slot e possíveis erros. Os slots geram com alguns minutos de diferença — dê um tempo e atualize o My Audios.</p>
<h3>Uma busca de notícias não retornou nada</h3><p>Combinações muito estreitas (viés específico + país pequeno + categoria incomum) podem ter pouca cobertura. Amplie as categorias, mude pra escopo <strong>Global</strong> ou troque o viés.</p>
<h3>Os horários no My Audios parecem estranhos</h3><p>Um número como <code>1m03</code> é a <strong>duração</strong> do boletim (1 min 3 seg), não um horário. A data mostra quando foi criado.</p>`,
    },
    {
      id: 'help',
      title: 'Ajuda',
      html: `<ul><li><strong>AURA Assistant</strong> (Standard e Pro): um chat de ajuda dentro do app — clique no botão de chat pra tirar dúvidas sobre como usar a AURA.</li><li><strong>Send feedback</strong>: use o item do menu pra reportar um bug, pedir um recurso ou dizer o que está funcionando. Vai direto pra equipe, e respondemos no email da sua conta.</li></ul>
<div class="callout tip"><span class="ic">✦</span><p>Obrigado por usar a AURA. Agora vá fazer uma ótima rádio.</p></div>`,
    },
  ],
};

const es: ManualStrings = {
  eyebrow: 'Audio de Radio Urbana Automatizado',
  h1a: 'Boletines con voz IA,',
  h1b: 'listos para el aire en segundos.',
  lede: 'Todo lo que necesitas — desde tu primer boletín hasta la transmisión totalmente automática, sin nadie en la consola. Sin conocimientos técnicos.',
  tocTitle: 'Índice',
  sections: [
    {
      id: 'what',
      title: 'Qué hace AURA',
      html: `<p>AURA convierte las noticias del día en un boletín de radio listo para el aire en unos <strong>30 segundos</strong>. Ella:</p>
<ol class="steps"><li><strong>Busca</strong> fuentes confiables de todo el mundo — filtradas por tema, sesgo político y ubicación.</li><li><strong>Escribe</strong> un guion de radio natural, con ritmo y emoción.</li><li><strong>Narra</strong> con una voz de IA de calidad profesional.</li><li><strong>Mezcla</strong> una pista de fondo (opcional) que baja bajo la voz.</li><li><strong>Entrega</strong> un MP3 (o WAV) listo para tu sistema de emisión.</li></ol>
<p>Hazlo <strong>al instante</strong> cuando quieras, o configura <strong>automatizaciones</strong> que generan y entregan boletines según un horario — incluso de madrugada, sin nadie en la consola.</p>`,
    },
    {
      id: 'start',
      title: 'Primeros Pasos',
      html: `<h3>Crea tu cuenta</h3><ol class="steps"><li>Entra en aurapress.app y haz clic en <strong>Start free</strong>.</li><li>Ingresa el <strong>nombre de tu emisora</strong>, tu <strong>correo</strong> y una <strong>contraseña</strong>.</li><li>Listo — sin tarjeta de crédito.</li></ol>
<h3>Tu prueba gratis</h3><p>Cada cuenta nueva empieza con <strong>14 días de Pro gratis</strong>. Tienes <strong>todas las funciones Pro</strong> (voces personalizadas, WAV, automatizaciones) con un límite de <strong>10 boletines por día</strong>. Al terminar la prueba solo eliges un plan — solo se cobra si te suscribes.</p>
<h3>Elige tu idioma</h3><p>AURA funciona en <strong>inglés, portugués y español</strong>. Se define al registrarte y se puede cambiar cuando quieras con el selector de idioma en la cabecera. Esto también controla el idioma en que se escriben y narran los boletines.</p>`,
    },
    {
      id: 'first',
      title: 'Tu Primer Boletín',
      html: `<p>La forma más rápida de hacer un boletín ahora, desde <strong>News Search</strong>:</p>
<ol class="steps"><li><strong>Configura las opciones.</strong> Categorías (Política, Economía, Tecnología, Deportes, Salud, Cultura, Música, Cine, Artes — combina varias); Sesgo (Izquierda, Centro, Derecha); Alcance geográfico — Global (mundo entero, traducido) o País (escribe cualquier país en Location; una ciudad o región también sirve, como palabra clave); Duración en segundos; Idioma de salida; y, opcionalmente, Include weather.</li><li>Haz clic en <strong>Search</strong>. AURA reúne las noticias más recientes.</li><li>Haz clic en <strong>Generate</strong>. AURA escribe, narra y (si elegiste música) mezcla. Se guarda solo en <strong>My Audios</strong>.</li></ol>
<div class="callout tip"><span class="ic">✦</span><p>El boletín abre directo con la noticia — sin "Buenos días" — para sonar como si entrara a una transmisión en vivo. Es intencional, ya que puede salir al aire a cualquier hora.</p></div>`,
    },
    {
      id: 'audios',
      title: 'My Audios — Tu Biblioteca',
      html: `<p>Cada boletín que generas queda aquí.</p>
<h3>Reproducir</h3><p>Haz clic en play para escuchar en el navegador.</p>
<h3>Editar el guion y regenerar</h3><p>Haz clic en <strong>Edit</strong> para abrir el editor. El boletín se divide en <strong>bloques</strong> (uno por noticia). Puedes editar el texto de un bloque o <strong>eliminar</strong> un bloque entero — por ejemplo, para quitar una noticia que no te gusta (el ícono de papelera aparece al pasar el cursor). Luego haz clic en <strong>Regenerate audio</strong>; AURA lo vuelve a narrar con tus cambios. Un aviso amarillo aparece cuando hay ediciones sin guardar.</p>
<h3>Descargar</h3><ul><li><strong>MP3</strong> — formato estándar, funciona en todo.</li><li><strong>WAV</strong> — sin pérdida, más calidad (solo Pro). Busca el botón WAV junto al MP3.</li></ul>
<h3>Guardar en una carpeta local</h3><p>Conecta AURA a una carpeta de tu computadora para que las descargas (y los boletines automáticos) caigan directo ahí — ideal para tu sistema de emisión. Configúralo una vez y AURA lo recuerda.</p>`,
    },
    {
      id: 'voices',
      title: 'My Voices',
      html: `<h3>Elegir la voz</h3><p>Explora el catálogo, haz clic en <strong>Preview</strong> para escuchar y <strong>Use</strong> para fijar tu predeterminada. La voz predeterminada se usa en los boletines nuevos.</p>
<h3>Velocidad</h3><p>Usa el control <strong>Default speed</strong> para que la voz lea más rápido o más lento.</p>
<h3>Clonar tu propia voz (Pro)</h3><p>Crea una voz personalizada — por ejemplo, el locutor de tu emisora:</p>
<ol class="steps"><li>Abre la sección de clonación en My Voices.</li><li>Sube <strong>1–5 muestras limpias</strong> (30–60 segundos cada una).</li><li>Ponle un nombre.</li><li>AURA crea la voz. Aparece arriba con la etiqueta <strong>Clonada</strong>.</li></ol>
<p>Renombra las voces clonadas cuando quieras con el ícono de lápiz.</p>
<div class="callout tip"><span class="ic">✦</span><p><strong>Pronunciación:</strong> las voces de IA a veces pronuncian mal sonidos regionales (como una "R" fuerte). Si la precisión importa en tu mercado, una voz clonada de un locutor nativo es la mejor solución.</p></div>`,
    },
    {
      id: 'autos',
      title: 'Automatizaciones — Configura y Olvida',
      html: `<p>Las automatizaciones son el corazón de la transmisión sin intervención. Defines <strong>cuándo</strong> y <strong>qué</strong>; AURA genera y entrega sola.</p>
<div class="callout tip"><span class="ic">✦</span><p>Las automatizaciones requieren el plan <strong>Standard</strong> o <strong>Pro</strong>. Elegir días específicos es Pro.</p></div>
<h3>Crear una automatización</h3>
<ol class="steps"><li>Ve a <strong>Automations → New</strong> y ponle un <strong>nombre</strong> (ej.: "Noticias de la Mañana").</li><li><strong>Agrega horarios (slots).</strong> Cada slot es un boletín programado. Por slot: Hora (07:00, 12:00…), Categorías de ese slot y Días de la semana (Pro).</li><li>Define las opciones generales: idioma, voz, sesgo, alcance, duración, velocidad, zona horaria, más clima y pista opcionales.</li><li><strong>Antelación (lead time)</strong> — minutos antes de cada slot en que AURA empieza a preparar (5–120). Menos = noticias más frescas; más = margen para que el archivo esté listo mucho antes del aire. Predeterminado 60.</li><li>Activa <strong>Enabled</strong> y haz clic en <strong>Save</strong>.</li></ol>
<h3>Boletines solo de clima</h3><p>Crea un slot <strong>sin categorías de noticias</strong> y con el clima activado — genera solo el pronóstico.</p>
<h3>Ver las ejecuciones</h3><p>Cada automatización guarda un <strong>historial</strong> de cada ejecución: qué slot se disparó, cuándo, éxito o fallo (con el motivo) y el audio generado. Usa <strong>Run now</strong> para probar un slot al instante.</p>`,
    },
    {
      id: 'music',
      title: 'Música de Fondo',
      html: `<h3>Subir la tuya</h3><p>Elige un archivo de audio de tu computadora. AURA lo mezcla bajo la voz automáticamente. Nada se comparte públicamente.</p>
<h3>Generar con IA (Pro)</h3><p>AURA crea una pista instrumental a medida del ánimo y la duración del boletín. Cada plan Pro incluye una cuota mensual de pistas de IA.</p>
<h3>Ducking interactivo</h3><p>Sea cual sea la forma, AURA hace <strong>ducking inteligente</strong>: la pista queda baja bajo la voz, sube en las pausas entre noticias y baja justo antes de que la voz regrese — la "respiración" natural de la radio profesional.</p>`,
    },
    {
      id: 'weather',
      title: 'Pronóstico del Clima',
      html: `<p>Para añadir el pronóstico a cualquier boletín:</p>
<ol class="steps"><li>Activa <strong>Include weather</strong>.</li><li>Ingresa la <strong>ciudad del clima</strong> (ej.: Madrid o Miami, FL). Usa una ciudad específica — un país entero no funciona para el clima.</li><li>Elige el <strong>formato</strong>: Bloque separado (pronóstico al final) o Integrado (dentro de las noticias).</li></ol>
<p>Incluye <strong>varias ciudades</strong> separando con coma o "y" (ej.: Madrid y Barcelona). AURA reporta cada una.</p>`,
    },
    {
      id: 'delivery',
      title: 'Destinos de Entrega',
      html: `<p>Además de descargar, AURA puede enviar los boletines listos a donde necesites. Configúralo en <strong>Settings → Delivery</strong>:</p>
<ul><li><strong>FTP</strong> — subir al servidor de tu emisora.</li><li><strong>Webhook (HTTP)</strong> — POST del audio a cualquier sistema tuyo.</li><li><strong>Email</strong> — enviar el boletín a un correo.</li><li><strong>Carpeta local</strong> — con una pestaña de AURA abierta, los boletines se sincronizan en una carpeta de tu computadora.</li><li><strong>Feed RSS</strong> — una URL privada tipo podcast que cualquier sistema RSS puede leer automáticamente.</li></ul>
<p>Los boletines automáticos se entregan a tus destinos justo después de generarse. (Cantidad y tipo dependen del plan.)</p>`,
    },
    {
      id: 'settings',
      title: 'Configuración',
      html: `<h3>Facturación</h3><p>Ve tu plan, cámbialo y gestiona tu suscripción. Las mejoras aplican al instante; gestiona o cancela cuando quieras desde el portal seguro de facturación.</p>
<h3>Marca (Pro — White Label)</h3><p>Añade el <strong>logo de tu emisora</strong> y el <strong>color de acento</strong> para que la app refleje tu marca en lugar de la de AURA.</p>
<h3>Entrega</h3><p>Configura tus destinos de entrega (ver arriba).</p>
<h3>Estado</h3><p>Una página de estado en vivo que muestra si cada parte del sistema (noticias, voz, clima, almacenamiento, correo…) está conectada y funcionando. Útil si algo falla.</p>`,
    },
    {
      id: 'plans',
      title: 'Planes y Límites',
      html: `<div class="table-wrap"><table>
<thead><tr><th>Función</th><th>Starter</th><th>Standard</th><th class="plan-pro">Pro</th></tr></thead>
<tbody>
<tr><td>Precio / mes</td><td>$19.99</td><td>$59.99</td><td class="plan-pro">$129.99</td></tr>
<tr><td>Boletines / día</td><td>5</td><td>10</td><td class="plan-pro">20</td></tr>
<tr><td>Duración máxima</td><td>60s</td><td>120s</td><td class="plan-pro">180s</td></tr>
<tr><td>Voces</td><td>1 preset</td><td>Varios presets</td><td class="plan-pro">Catálogo completo + clonación</td></tr>
<tr><td>Formatos</td><td>MP3</td><td>MP3 + WAV</td><td class="plan-pro">MP3 + WAV</td></tr>
<tr><td>Automatización</td><td>—</td><td>Simple (diaria)</td><td class="plan-pro">Completa + por día</td></tr>
<tr><td>Pistas de IA</td><td>—</td><td>—</td><td class="plan-pro">Cuota mensual</td></tr>
<tr><td>Entrega</td><td>Descarga</td><td>Limitada</td><td class="plan-pro">Ilimitada</td></tr>
<tr><td>White label</td><td>—</td><td>—</td><td class="plan-pro">Sí</td></tr>
<tr><td>Soporte</td><td>Correo</td><td>Correo + chat</td><td class="plan-pro">Correo prioritario</td></tr>
</tbody></table></div>
<p>Tu <strong>prueba de 14 días</strong> te da funciones Pro con un límite de 10 boletines por día.</p>`,
    },
    {
      id: 'trouble',
      title: 'Consejos y Solución de Problemas',
      html: `<h3>El boletín muestra la fecha equivocada</h3><p>AURA usa la <strong>zona horaria</strong> de tu cuenta para saber la fecha de hoy. Verifica que esté bien en tu automatización o en los ajustes de la cuenta.</p>
<h3>El clima no apareció</h3><p>Usa una <strong>ciudad específica</strong> (no un país) y verifica que <strong>Include weather</strong> esté activado. Para dos ciudades, separa con coma o "y".</p>
<h3>Mi automatización solo generó uno de varios slots</h3><p>Abre el <strong>historial</strong> de la automatización para ver el estado de cada slot y cualquier error. Los slots se generan con minutos de diferencia — dale tiempo y refresca My Audios.</p>
<h3>Una búsqueda de noticias no devolvió nada</h3><p>Combinaciones muy estrechas (sesgo específico + país pequeño + categoría inusual) pueden tener poca cobertura. Amplía las categorías, cambia a alcance <strong>Global</strong> o cambia el sesgo.</p>
<h3>Las horas en My Audios se ven raras</h3><p>Un número como <code>1m03</code> es la <strong>duración</strong> del boletín (1 min 3 seg), no una hora. La fecha muestra cuándo se creó.</p>`,
    },
    {
      id: 'help',
      title: 'Ayuda',
      html: `<ul><li><strong>AURA Assistant</strong> (Standard y Pro): un chat de ayuda dentro de la app — haz clic en el botón de chat para preguntar cómo usar AURA.</li><li><strong>Send feedback</strong>: usa el elemento del menú para reportar un error, pedir una función o contarnos qué funciona. Va directo al equipo, y respondemos al correo de tu cuenta.</li></ul>
<div class="callout tip"><span class="ic">✦</span><p>Gracias por usar AURA. Ahora ve a hacer una gran radio.</p></div>`,
    },
  ],
};

const MANUAL: Record<Locale, ManualStrings> = { en, pt, es };

export function getManual(locale: Locale): ManualStrings {
  return MANUAL[locale] ?? MANUAL.en;
}
