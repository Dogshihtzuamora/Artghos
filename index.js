#!/usr/bin/env node
const ReqArt = require('./Artghos');
const pkg = require('./package.json');
const fs = require('fs');
const path = require('path');

// Verificar e configurar chave secreta na primeira execução
const configPath = path.join(process.cwd(), 'artghos.config.json');
if (!fs.existsSync(configPath)) {
  console.log('\n🔐 Configuração inicial de segurança do Artghos');
  console.log('Gerando chave secreta para assinatura digital de pacotes...');
  ReqArt.ArtPacker.setupSecretKey();
  console.log('✅ Configuração concluída! Esta chave será usada para todos os pacotes.\n');
}

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
  artghos install <p1> <p2> ...       Empacota múltiplos pacotes (ex.: express lodash bcrypt)
  artghos install nome@versao         Forma compacta (ex.: express@4.18.0)
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
  console.log('      artghos install <p1> <p2> ...');
  console.log('      artghos install nome@versao');
  console.log('Use artghos --help para mais informações');
  process.exit(1);
}

// Suporta múltiplos pacotes e formas nome@versao
const packages = [];
for (let i = 1; i < args.length; i++) {
  const token = args[i];
  if (token.startsWith('--')) continue; // flags são lidas por Artghos.js via process.argv
  const atIdx = token.indexOf('@');
  if (atIdx > 0) {
    const name = token.slice(0, atIdx);
    const ver = token.slice(atIdx + 1) || 'latest';
    packages.push({ name, version: ver });
  } else {
    packages.push({ name: token, version: 'latest' });
  }
}

if (packages.length === 0) {
  console.log('Nenhum pacote válido informado.');
  process.exit(1);
}

(async () => {
  let ok = 0;
  for (const { name, version } of packages) {
    try {
      console.log(`Empacotando ${name}@${version}...`);
      const out = ReqArt.install(name, version);
      console.log(`✓ Concluído: ${out}`);
      ok++;
    } catch (err) {
      console.error(`Erro ao empacotar ${name}: ${err.message}`);
    }
  }
  if (ok === 0) process.exit(1);
})();