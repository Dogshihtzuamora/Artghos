# Artghos

Sistema de empacotamento e carregamento de pacotes Node.js em formato `.art`

## 📦 O que é?

Artghos permite empacotar qualquer pacote npm (com todas suas dependências) em um único arquivo `.art` compactado, que pode ser facilmente distribuído e carregado sem precisar de internet ou npm install.

## 🚀 Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/Dogshihtzuamora/Artghos.git
cd Artghos
```

### 2. Instale as dependências

```bash
npm install tar
```

## 📝 Como usar

### 1. Criar um pacote .art

Use o `app.js` para baixar e empacotar qualquer pacote do npm:

```bash
node app.js <nome-do-pacote> [versao]
```

**Exemplos:**
```bash
node app.js express
node app.js express 4.18.0
node app.js lodash latest
```

Isso vai:
- Baixar o pacote e todas as dependências
- Empacotar tudo em um arquivo `.art`
- Salvar em `./art-packages/nome-do-pacote.art`

### 2. Carregar um pacote .art

Use a função `ReqArt` da pasta `Art` para carregar pacotes:

```javascript
const ReqArt = require('./Art');

// Carrega o pacote
const express = ReqArt('./art-packages/express.art');

// Use normalmente
const app = express();
app.get('/', (req, res) => {
  res.send('Olá do Express via .art!');
});
app.listen(3000);
```

## ✨ Vantagens

- ✅ **Portável**: Um único arquivo com tudo incluído
- ✅ **Offline**: Não precisa de internet para usar
- ✅ **Rápido**: Cache automático - carrega uma vez só
- ✅ **Simples**: Sem npm install, sem node_modules gigante
- ✅ **Universal**: Funciona em qualquer sistema com Node.js

## 📁 Estrutura

```
Artghos/
├── app.js              # Criador de pacotes .art
├── Art.js              # Carregador de pacotes .art
├── art-packages/       # Pasta onde ficam os .art criados
└── README.md
```

## 🛠️ Requisitos

- Node.js (qualquer versão recente)
- npm (para baixar pacotes)
- Biblioteca `tar` instalada

## 📖 Exemplo completo

```javascript
// 1. Criar o pacote (terminal)
// node app.js axios

// 2. Usar no código
const ReqArt = require('./Art');
const axios = ReqArt('./art-packages/axios.art');

axios.get('https://api.github.com/users/github')
  .then(response => console.log(response.data))
  .catch(error => console.error(error));
```

## ⚠️ Notas

- Pacotes .art incluem **todas as dependências**, então podem ficar grandes
- O cache evita re-extrair o mesmo pacote várias vezes
- Funciona com qualquer pacote disponível no npm

## 📄 Licença

MIT

---

**Feito com ❤️ para facilitar o compartilhamento de pacotes Node.js**
