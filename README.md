# Artghos

Sistema de empacotamento e carregamento de pacotes Node.js em formato `.art`

## 📦 O que é?

Artghos permite empacotar qualquer pacote npm (com todas suas dependências) em um único arquivo `.art` compactado, que pode ser distribuído e carregado sem precisar de internet ou npm install.

## 🚀 Instalação

### Uso Global
```bash
npm install -g artghos
```

### Uso Local
```bash
npm install artghos
```

## 📝 Como usar

### Criar um pacote .art

```bash
artghos <nome-do-pacote> [versao]
```

**Exemplos:**
```bash
artghos express
artghos express 4.18.0
artghos lodash latest
artghos hyperswarm
```

Isso gera um arquivo `.art` em `./art-packages/`

### Carregar um pacote .art

```javascript
const ReqArt = require('artghos');

// Forma simplificada (busca automaticamente em art-packages/)
const express = ReqArt('express');

// Ou com caminho completo
const lodash = ReqArt('./art-packages/lodash.art');

// Usar normalmente
const app = express();
app.get('/', (req, res) => res.send('Olá via .art!'));
app.listen(3000);
```

## ✨ Vantagens

- ✅ **Portável**: Um único arquivo com tudo incluído
- ✅ **Offline**: Funciona sem internet ou npm
- ✅ **Zero dependências**: Usa apenas módulos nativos do Node.js
- ✅ **Cache inteligente**: Carregamento instantâneo após primeira vez
- ✅ **Compactação gzip**: Arquivos menores e eficientes
- ✅ **Auto-detecção ESM**: Suporta CommonJS e ES Modules automaticamente

## 📖 Exemplos

### Exemplo 1: Lodash
```bash
# Criar pacote
artghos lodash

# Usar no código
const ReqArt = require('artghos');
const _ = ReqArt('lodash');

console.log(_.chunk([1, 2, 3, 4], 2)); // [[1, 2], [3, 4]]
console.log(_.sum([1, 2, 3, 4, 5]));   // 15
```

### Exemplo 2: Express Server
```bash
# Criar pacote
artghos express

# Usar no código
const ReqArt = require('artghos');
const express = ReqArt('express');

const app = express();
app.get('/', (req, res) => res.send('Express via .art!'));
app.listen(3000, () => console.log('Servidor rodando!'));
```

### Exemplo 3: Axios
```bash
# Criar pacote
artghos axios

# Usar no código
const ReqArt = require('artghos');
const axios = ReqArt('axios');

axios.get('https://api.github.com/users/octocat')
  .then(response => console.log(response.data.name))
  .catch(error => console.error(error));
```

### Exemplo 4: Hyperswarm P2P
```bash
# Criar pacote
artghos hyperswarm

# Usar no código
const ReqArt = require('artghos');
const Hyperswarm = ReqArt('hyperswarm');

const swarm = new Hyperswarm();
const topic = Buffer.alloc(32).fill('meu-topico');

swarm.join(topic, { server: true, client: true });
swarm.on('connection', (conn) => {
  console.log('Nova conexão P2P!');
  conn.write('Olá peer!');
});
```

## ⚡ Performance

```
Primeira carga (sem cache):  ~400-500ms
Cargas seguintes (cache):    ~0.03ms (13,000x mais rápido!)
```

O cache em memória torna carregamentos subsequentes praticamente instantâneos.

## 🎯 Casos de Uso

- 📦 Distribuir aplicações com dependências incluídas
- 🌐 Desenvolvimento offline
- 🚀 Deploy simplificado (copiar um arquivo vs npm install)
- 💾 Backup de versões específicas de pacotes
- 🔒 Ambientes sem acesso ao npm registry
- 🎮 Plugins e extensões auto-contidas

## 🛠️ Requisitos

- Node.js v14 ou superior
- npm (apenas para criar os pacotes .art)

## 📁 Estrutura de Arquivos

```
seu-projeto/
├── art-packages/           # Pacotes .art criados
│   ├── lodash.art
│   ├── express.art
│   └── axios.art
└── seu-app.js
```

## 🔧 Como Funciona

1. **Criação**: Baixa pacote do npm → empacota com dependências → comprime com gzip
2. **Carregamento**: Descomprime → extrai arquivos → carrega módulo → mantém em cache
3. **Cache**: Módulos carregados ficam em memória para acesso instantâneo

## ⚠️ Notas

- Pacotes `.art` incluem todas as dependências, podendo ficar grandes
- Cache em memória é limpo quando o processo Node.js encerra
- Compatível com pacotes CommonJS e ES Modules
- Não requer `tar` ou outras dependências externas

## 📄 Licença

MIT

---

**Feito com ❤️ para facilitar o compartilhamento de pacotes Node.js**
