# Artghos

Sistema de empacotamento e carregamento de pacotes Node.js em formato `.art` com suporte a ESM/CommonJS e sistema de segurança avançado.

## 📦 O que é?

Artghos permite empacotar qualquer pacote npm (com todas suas dependências) em um único arquivo `.art` compactado, que pode ser distribuído e carregado sem precisar de internet ou npm install. Agora com suporte completo para módulos ESM e CommonJS, além de um sistema de segurança robusto contra malware.

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
artghos install <nome-do-pacote> [versao]
```

**Exemplos:**
```bash
artghos install express
artghos install express 4.18.0
artghos install lodash latest
artghos install hyperswarm
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

### Observações importantes
- `express` possui whitelist de segurança ativa: arquivos marcados como “alto risco” dentro do pacote e em `node_modules/` são escritos e o processo não aborta. Os avisos permanecem nos logs.
- Para outros pacotes, se o scanner marcar alto risco, execute seu script com `--force-unpack` para permitir a escrita dos arquivos e prosseguir.

## ✨ Vantagens

- ✅ **Portável**: Um único arquivo com tudo incluído
- ✅ **Offline**: Funciona sem internet ou npm
- ✅ **Zero dependências**: Usa apenas módulos nativos do Node.js
- ✅ **Cache inteligente**: Carregamento instantâneo após primeira vez
- ✅ **Compactação gzip**: Arquivos menores e eficientes
- ✅ **Suporte completo a ESM/CommonJS**: Detecção automática e carregamento dinâmico
- ✅ **Sistema de segurança avançado**: Proteção contra malware e adulteração
- ✅ **Assinatura digital**: Verificação de integridade dos pacotes
- ✅ **Análise contextual**: Detecção inteligente de código malicioso

## 🔒 Sistema de Segurança

Artghos inclui um sistema de segurança avançado para proteger contra malware:

- **Assinatura digital**: Cada arquivo .art é assinado digitalmente para garantir integridade
- **Verificação de integridade**: Detecta qualquer adulteração nos pacotes
- **Análise contextual**: Sistema inteligente que diferencia código legítimo de malicioso
- **Pontuação de risco**: Avaliação baseada em múltiplos fatores de segurança
- **Whitelist de bibliotecas**: Permite uso legítimo de APIs sensíveis por bibliotecas confiáveis

### Flags de segurança

```bash
# Forçar empacotamento mesmo com avisos de segurança
artghos install express --force-pack

# Forçar desempacotamento mesmo com avisos de segurança
node seu-script.js --force-unpack
```

### Assinatura Digital e Chave Secreta
- Todo `.art` é assinado digitalmente (HMAC-SHA256) durante o empacotamento.
- Prioridade da chave secreta:
  1. `ARTGHOS_SECRET_KEY` (variável de ambiente)
  2. `artghos.config.json` (na raiz)
  3. Chave padrão de desenvolvimento (gera aviso)
- Após empacotar, a assinatura é verificada para confirmar integridade.

### Comportamento com Conteúdo Suspeito
- Empacotamento: arquivos de alto risco abortam, a menos que `--force-pack` seja usado.
- Desempacotamento:
  - Por padrão, arquivos de alto risco abortam; com `--force-unpack`, eles são escritos.
  - Para `express`, há whitelist: desempacota sem `--force-unpack`, mantendo avisos para auditoria.

## 🔄 Suporte a ESM e CommonJS

Artghos agora suporta completamente tanto módulos CommonJS quanto ESM:

### Módulos CommonJS (tradicional)
```javascript
const ReqArt = require('artghos');
const lodash = ReqArt('lodash');
console.log(lodash.chunk([1, 2, 3, 4], 2));
```

### Módulos ESM (import/export)
```javascript
const ReqArt = require('artghos');
const chalk = ReqArt('chalk');

// Para módulos ESM, use o método import()
const chalkModule = await chalk.import();
console.log(chalkModule.default.green('Sucesso!'));
```

### Resolução de Dependências e Diretório Temporário
- O carregamento usa `createRequire` para garantir resolução de módulos CommonJS relativa ao ponto de entrada.
- O diretório temporário de extração (`art-packages/.reqart-temp/<pacote>`) permanece acessível até o encerramento do processo, permitindo resolver dependências sob demanda.

## 📖 Exemplos

### Exemplo com lodash (CommonJS)

```javascript
// Instalar lodash como .art
// $ artghos install lodash

// Usar lodash de um arquivo .art
const ReqArt = require('artghos');
const _ = ReqArt('lodash');

console.log(_.chunk(['a', 'b', 'c', 'd'], 2));
// => [['a', 'b'], ['c', 'd']]
```

### Exemplo com express (CommonJS)

```javascript
// Instalar express como .art
// $ artghos install express

// Usar express de um arquivo .art
const ReqArt = require('artghos');
const express = ReqArt('express');

const app = express();
app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});
```

### Exemplo com axios (CommonJS)

```javascript
// Instalar axios como .art
// $ artghos install axios

// Usar axios de um arquivo .art
const ReqArt = require('artghos');
const axios = ReqArt('axios');

async function getData() {
  const response = await axios.get('https://jsonplaceholder.typicode.com/todos/1');
  console.log(response.data);
}

getData();
```

### Exemplo com React (ESM)

```javascript
// Instalar react como .art
// $ artghos install react

// Usar react (ESM) de um arquivo .art
const ReqArt = require('artghos');
const react = ReqArt('react');

// Para módulos ESM, use o método import()
async function exemplo() {
  const React = await react.import();
  
  // Agora você pode usar React normalmente
  const element = React.createElement('div', null, 'Hello, world!');
  console.log(element);
}

exemplo();
```

### Exemplo com biblioteca confiável usando APIs sensíveis

```javascript
// Instalar uma biblioteca confiável que usa child_process
// $ artghos install cross-env

// O sistema de segurança permitirá o empacotamento por ser uma biblioteca confiável
const ReqArt = require('artghos');
const crossEnv = ReqArt('cross-env');

// Use normalmente
```

### Exemplo com flags de segurança

```bash
# Empacotar forçando mesmo com avisos de segurança
artghos install lodash latest --force-pack

# Carregar forçando escrita de arquivos marcados como alto risco
node seu-script.js --force-unpack
```

## ⚡ Performance

O Artghos foi projetado para ser rápido e eficiente:

- **Cache inteligente**: Após o primeiro carregamento, os módulos são armazenados em cache
- **Compactação eficiente**: Reduz o tamanho dos pacotes sem comprometer a velocidade
- **Carregamento seletivo**: Carrega apenas os módulos necessários quando solicitados

```
Primeira carga (sem cache):  ~400-500ms
Cargas seguintes (cache):    ~0.03ms (13,000x mais rápido!)
```

O cache em memória torna carregamentos subsequentes praticamente instantâneos.

## 🧪 Teste Rápido

### Express (sem `--force-unpack`)
```bash
node ./asd/index.js
# Abra http://localhost:3000/
```

### Lodash
```bash
# Na raiz
node ./Artghos.js lodash latest --force-pack

# Carregar via ReqArt
node -e "const ReqArt=require('./Artghos.js'); const _=ReqArt('lodash'); console.log(_.capitalize('artghos funcionando com lodash'));" -- --force-unpack
```

## 📄 Licença

MIT © Artghos

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
