# 🚀 Instruções Passo a Passo - Rodar LLWebsite na Máquina Windows

## 📝 ANTES DE COMEÇAR

Você vai precisar de 2 coisas instaladas:
1. **Git** - Para baixar o código
2. **Node.js** - Para rodar o projeto

---

## ✅ PASSO 1: Instalar Git

### 1.1 - Abra o navegador e vá para:
```
https://git-scm.com/download/win
```

### 1.2 - Clique no botão verde "Download"
Vai baixar um arquivo `.exe`

### 1.3 - Execute o instalador
- Clique duas vezes no arquivo baixado
- Clique "Next" em todas as telas
- Quando chegar em "Select Components", deixe tudo marcado
- Clique "Install"
- Clique "Finish"

### 1.4 - Teste se funcionou
- Abra o **Explorador de Arquivos** (Windows + E)
- Clique com botão direito em qualquer pasta vazia
- Deve aparecer "Git Bash Here"
- Se apareceu ✅ Git está instalado

---

## ✅ PASSO 2: Instalar Node.js

### 2.1 - Abra o navegador e vá para:
```
https://nodejs.org
```

### 2.2 - Clique em "LTS" (Long Term Support)
A versão recomendada

### 2.3 - Execute o instalador
- Clique duas vezes no arquivo `.msi` baixado
- Clique "Next"
- Marque "I accept..." e clique "Next"
- Deixe path padrão (não mude)
- Clique "Next" até final
- Clique "Install"
- Clique "Finish"

### 2.4 - Teste se funcionou
- Pressione: **Windows + R**
- Digite: `cmd`
- Pressione Enter
- Na janela que abriu, digite:
```bash
node --version
```
- Deve aparecer algo como: `v18.x.x` ou `v20.x.x` ✅

---

## ✅ PASSO 3: Clonar o Repositório (Baixar o Código)

### 3.1 - Crie uma pasta para o projeto
- Abra **Explorador de Arquivos** (Windows + E)
- Vá para: `C:\Users\[SEU_USUARIO]\Documents`
- Clique com direito em espaço vazio
- Selecione "Nova Pasta"
- Nomeie como: `Projetos` (ou deixe um nome de sua escolha)

### 3.2 - Abra Git Bash nessa pasta
- Clique com **direito do mouse** na pasta `Projetos`
- Selecione: **"Git Bash Here"**
- Vai abrir uma janela preta (terminal)

### 3.3 - Clone o repositório
Na janela do Git Bash, copie e cole este comando:

```bash
git clone https://github.com/luizlaffey-prod/LLWebsite-7318.git
cd LLWebsite-7318
```

Pressione **Enter** e espere terminar (pode demorar alguns segundos).

---

## ✅ PASSO 4: Instalar as Dependências do Projeto

Ainda na janela Git Bash (deve estar na pasta `LLWebsite-7318`), execute:

```bash
npm install --legacy-peer-deps
```

⏳ **Vai demorar 2-5 minutos** - é normal, não feche a janela!

Quando terminar, deve aparecer algo como:
```
added XXX packages
```

---

## ✅ PASSO 5: Rodar o Projeto

Ainda na mesma janela Git Bash, execute:

```bash
npm run dev
```

Vai aparecer algo como:

```
  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

✅ **Projeto está rodando!**

---

## ✅ PASSO 6: Ver o Site no Navegador

### 6.1 - Copie o link
Veja na janela do Git Bash o link: `http://localhost:5173/`

### 6.2 - Abra no navegador
- Clique em qualquer navegador (Chrome, Edge, Firefox, etc)
- Na barra de endereço, cole: `http://localhost:5173/`
- Pressione **Enter**

✅ **Site deve carregar!**

---

## 🧪 TESTANDO O FLUXO DE SUBSCRIÇÃO

1. **Home** → Clique em **"Originals"** (menu topo)
2. Escolha um programa (ex: "Zero Point Zero")
3. Clique em **"Subscribe"** ou **"Planos"**
4. Escolha um plano e clique
5. **Faça login** (pode usar qualquer email/senha para teste)
6. Clique em **"Subscribe"** novamente
7. 🎉 **Deve aparecer página de sucesso com seu nome!**
8. Clique em **"Go to Your Programs"**
9. Deve aparecer: **"Welcome, [seu nome]"**

✅ Se tudo funcionou, está tudo certo!

---

## 🛑 PARAR O PROJETO

Quando quiser parar:

Na janela Git Bash, pressione: **`Ctrl + C`**

Vai aparecer:
```
^C
```

Fechou ✅

---

## 🔄 PRÓXIMAS VEZES QUE QUISER RODAR

Quando for usar de novo:

1. Abra **Explorador de Arquivos**
2. Vá para: `C:\Users\[SEU_USUARIO]\Documents\Projetos\LLWebsite-7318`
3. Clique com direito
4. Selecione **"Git Bash Here"**
5. Execute:
```bash
npm run dev
```
6. Abra navegador em `http://localhost:5173/`

---

## 📥 ATUALIZAR O CÓDIGO (Quando há mudanças novas)

Quando eu disser que há mudanças novas:

1. Abra Git Bash na pasta do projeto
2. Execute:
```bash
git pull origin main
```
3. Se o servidor está rodando, ele vai recarregar automaticamente
4. Se não, execute `npm run dev` novamente

---

## ⚠️ PROBLEMAS?

### ❌ "Comando npm não encontrado"
- Significa que Node.js não foi instalado corretamente
- Feche a janela Git Bash
- Reinstale Node.js seguindo PASSO 2 novamente
- Abra uma nova janela Git Bash

### ❌ "Porta 5173 já em uso"
- Significa que há outro `npm run dev` rodando
- Pressione `Ctrl + C` na outra janela
- Execute `npm run dev` novamente na janela atual

### ❌ Página não carrega no navegador
- Verifique se a janela Git Bash ainda está aberta (mostra o link?)
- Se não estiver, execute `npm run dev` novamente
- Tente outro navegador (Chrome, Edge, Firefox)

### ❌ Página mostra erro ao fazer login/subscribe
- Abra as **Ferramentas do Desenvolvedor** (F12)
- Vá para aba **Console** (preto)
- Copie qualquer mensagem de erro vermelha
- Me envie screenshot

---

## ✨ Pronto!

Agora você pode ver e testar o site na sua máquina! 🎉

**Precisa de ajuda?** Me chama!
