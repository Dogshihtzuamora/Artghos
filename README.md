Artghos

Sistema de empacotamento e carregamento de pacotes Node.js em formato .art

📦 O que é?

Artghos permite empacotar qualquer pacote npm (com todas as dependências) em um único arquivo .art, que pode ser carregado sem internet ou npm install.

🚀 Instalação

npm install -g artghos

Ou, para uso local:

npm install artghos

📝 Como usar

Criar um pacote .art

artghos <nome-do-pacote> [versao]

Exemplos:

artghos express
artghos express 4.18.0
artghos lodash latest

Isso gera um arquivo .art em ./art-packages/.

Carregar um pacote .art

const ReqArt = require('artghos');

const express = ReqArt('./art-packages/express.art');

const app = express();
app.get('/', (req, res) => res.send('Olá via .art!'));
app.listen(3000);

✨ Vantagens

✅ Portável e offline

✅ Zero dependências externas

✅ Rápido e cacheado em memória

✅ Compactação gzip eficiente


📖 Exemplo rápido

artghos lodash

const ReqArt = require('artghos');
const _ = ReqArt('./art-packages/lodash.art');
console.log(_.chunk([1,2,3,4], 2)); // [[1,2],[3,4]]

📄 Licença

MIT


---

Feito com ❤️ para facilitar o compartilhamento de pacotes Node.js
