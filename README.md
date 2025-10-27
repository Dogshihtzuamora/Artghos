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

### 2. Pronto para usar!

Não precisa instalar nada! O Artghos usa apenas módulos nativos do Node.js.

## 📝 Como usar

### 1. Criar um pacote .art

Use o `Artghos.js` para baixar e empacotar qualquer pacote do npm:

```bash
node Artghos.js <nome-do-pacote> [versao]
```

**Exemplos:**
```bash
node Artghos.js express
node Artghos.js express 4.18.0
node Artghos.js lodash latest
node Artghos.js hyperswarm
```

Isso vai:
- Baixar o pacote e todas as dependências via npm
- Empacotar tudo em um arquivo `.art` compactado
- Salvar em `./art-packages/nome-do-pacote.art`

### 2. Carregar um pacote .art

Use a função `ReqArt` para carregar pacotes:

```javascript
const ReqArt = require('./Artghos.js');

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
- ✅ **Zero dependências**: Usa apenas módulos nativos (fs, path, zlib)
- ✅ **Compacto**: Compressão gzip eficiente

## 📁 Estrutura

```
Artghos/
├── Artghos.js          # Sistema completo (criar e carregar .art)
├── art-packages/       # Pasta onde ficam os .art criados
└── README.md
```

## 🛠️ Requisitos

- Node.js v14 ou superior
- npm (apenas para baixar pacotes na criação dos .art)

## 📖 Exemplos

### Exemplo 1: Express Server

```javascript
// 1. Criar o pacote (terminal)
// node Artghos.js express

// 2. Usar no código
const ReqArt = require('./Artghos.js');
const express = ReqArt('./art-packages/express.art');

const app = express();
app.get('/', (req, res) => res.send('Express via .art!'));
app.listen(3000, () => console.log('Servidor rodando!'));
```

### Exemplo 2: Lodash

```javascript
// 1. Criar o pacote
// node Artghos.js lodash

// 2. Usar
const ReqArt = require('./Artghos.js');
const _ = ReqArt('./art-packages/lodash.art');

console.log(_.chunk([1, 2, 3, 4], 2)); // [[1, 2], [3, 4]]
console.log(_.sum([1, 2, 3, 4, 5]));   // 15
```

### Exemplo 3: Hyperswarm P2P

```javascript
// 1. Criar o pacote
// node Artghos.js hyperswarm

// 2. Usar
const ReqArt = require('./Artghos.js');
const Hyperswarm = ReqArt('./art-packages/hyperswarm.art');

const swarm = new Hyperswarm();
const topic = Buffer.alloc(32).fill('meu-topico');

swarm.join(topic, { server: true, client: true });
swarm.on('connection', (conn) => {
  console.log('Nova conexão P2P!');
  conn.write('Olá peer!');
});
```

### Exemplo 4: Uso programático

```javascript
const ReqArt = require('./Artghos.js');

// Instalar e criar .art programaticamente
ReqArt.install('axios', '1.6.0');

// Depois carregar
const axios = ReqArt('./art-packages/axios.art');
axios.get('https://api.github.com/users/github')
  .then(res => console.log(res.data));
```

## ⚙️ Como funciona

1. **Criação**: `npm install` baixa o pacote → empacota tudo em formato customizado → comprime com gzip
2. **Carregamento**: Descomprime → extrai arquivos → carrega o módulo → limpa arquivos temporários
3. **Cache**: Módulos já carregados ficam em memória para acesso instantâneo

## ⚠️ Notas

- Pacotes .art incluem **todas as dependências**, então podem ficar grandes
- O cache evita re-extrair o mesmo pacote várias vezes
- Funciona com qualquer pacote disponível no npm
- Arquivos temporários são limpos automaticamente
- Não usa `tar` - formato customizado mais simples

## 🎯 Casos de uso

- 📦 Distribuir apps com dependências incluídas
- 🌐 Apps offline-first
- 🔒 Ambientes sem acesso ao npm
- 🚀 Deploy simplificado
- 💾 Backup de versões específicas
- 🎮 Plugins/mods auto-contidos

## 📄 Licença

MIT

---

**Feito com ❤️ para facilitar o compartilhamento de pacotes Node.js**
