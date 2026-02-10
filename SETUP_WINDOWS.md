# 🚀 Setup do LLWebsite-7318 no Windows

## ✅ Pré-requisitos

Antes de começar, certifique-se de que tem instalado:

1. **Git** - https://git-scm.com/download/win
   - Durante instalação, selecione "Git Bash Here"
   - Aceite todas as opções padrão

2. **Node.js** - https://nodejs.org (versão 18+)
   - Baixe a versão LTS (Long Term Support)
   - Durante instalação, deixe "npm" marcado

3. **Visual Studio Code** (opcional mas recomendado) - https://code.visualstudio.com/download

## 📋 Passo 1: Clonar o Repositório

Abra **Git Bash** (clique direito em qualquer pasta → "Git Bash Here"):

```bash
cd Documents
git clone https://github.com/luizlaffey-prod/LLWebsite-7318.git
cd LLWebsite-7318
```

## 📦 Passo 2: Instalar Dependências

No **Git Bash** (mesmo na pasta do projeto):

```bash
npm install --legacy-peer-deps
```

⏳ **Vai demorar 2-5 minutos**, é normal.

Se aparecer warning em amarelo, ignore. Se tiver erro em vermelho (ERROR), avise.

## 🏃 Passo 3: Rodar o Projeto

Ainda no **Git Bash**:

```bash
npm run dev
```

Vai aparecer algo como:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

Copie o link `http://localhost:5173/` e abra no navegador.

## 🔄 Passo 4: Atualizar do GitHub

Quando há mudanças novas, abra **Git Bash** na pasta do projeto e execute:

```bash
git pull origin main
```

Se o servidor está rodando, pode deixar rodando - a página vai recarregar automaticamente.

## 🧪 Testando o Fluxo de Subscrição

1. Na página inicial, clique em **Originals** → escolha um programa
2. Clique em **Subscribe** (ou **Planos**)
3. Clique em um plano
4. Faça login (use email/senha qualquer para teste)
5. Clique em **Subscribe** novamente
6. **Deve redirecionar para página de sucesso** com seu nome e detalhes
7. Clique em "Go to Your Programs"
8. **Deve aparecer "Welcome, [seu nome]"** e seus programas

## 🛑 Parar o Servidor

No **Git Bash**, pressione: `Ctrl + C`

## ⚠️ Problemas Comuns

### "npm: comando não encontrado"
- Node.js não foi instalado ou não está no PATH
- Restart o Git Bash e tente novamente
- Se persistir, reinstale Node.js

### Porta 5173 já em uso
```bash
# Parar servidor anterior
tasklist | find "node"
taskkill /PID [número] /F
```

Depois rode `npm run dev` novamente

### "Cannot find module"
```bash
# Limpar e reinstalar
rm -r node_modules
npm install --legacy-peer-deps
```

### Erro ao fazer git pull
```bash
# Descartar mudanças locais e atualizar
git reset --hard
git pull origin main
```

## 📁 Estrutura do Projeto

```
LLWebsite-7318/
├── src/
│   ├── web/
│   │   ├── pages/          # Páginas do site
│   │   ├── components/     # Componentes React
│   │   └── hooks/          # Lógica compartilhada
│   ├── api/                # API backend
│   └── index.html
├── package.json            # Dependências
└── wrangler.toml          # Config Cloudflare
```

## 🔑 Comandos Úteis

```bash
# Rodar dev server
npm run dev

# Build para produção
npm run build

# Visualizar build
npm run preview

# Parar servidor
Ctrl + C

# Atualizar código do GitHub
git pull origin main

# Ver histórico de commits
git log --oneline -10

# Ver status atual
git status
```

## 📞 Precisa de Ajuda?

Se tiver erro:

1. **Copie a mensagem de erro completa**
2. **Screenshot do terminal**
3. **Descreva o que estava fazendo quando errououu**

## ✨ Próximas Features

- [x] Página de sucesso pós-subscrição com nome do usuário
- [ ] Email de confirmação automático
- [ ] PayPal integrado (em produção)
- [ ] Download de broadcast files
- [ ] Station Settings funcional

---

**Última atualização:** 10 de Fevereiro de 2026
**Commit atual:** b7002ae
