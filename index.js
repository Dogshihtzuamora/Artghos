#!/usr/bin/env node
const ReqArt = require('./Artghos');
const pkg = require('./package.json');

const args = process.argv.slice(2);
const command = args[0];

if (command === '--version' || command === '-v') {
  console.log(`artghos v${pkg.version}`);
  process.exit(0);
}

if (command === '--help' || command === '-h') {
  console.log(`
Artghos v${pkg.version} - Sistema de empacotamento seguro de pacotes Node.js

Uso:
  artghos install <pacote> [versao]   Baixa e empacota um pacote npm
  artghos --version, -v               Mostra a versão
  artghos --help, -h                  Mostra esta ajuda

Flags de segurança:
  --force-pack                        Força empacotamento ignorando avisos
  --force-unpack                      Força desempacotamento ignorando avisos

Exemplos:
  artghos install lodash
  artghos install express 4.18.0
  artghos install axios latest
  artghos install express --force-pack

🔒 Segurança:
  Todos os pacotes são verificados quanto a conteúdo malicioso
  e assinados digitalmente para garantir integridade.
  `);
  process.exit(0);
}

if (command !== 'install' || !args[1]) {
  console.log('Uso: artghos install <pacote> [versao]');
  console.log('Use artghos --help para mais informações');
  process.exit(1);
}

const pacote = args[1];
let versao = 'latest';

for (let i = 2; i < args.length; i++) {
  if (!args[i].startsWith('--')) {
    versao = args[i];
    break;
  }
}


ReqArt.install(pacote, versao);