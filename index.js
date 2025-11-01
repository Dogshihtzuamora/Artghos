#!/usr/bin/env node
const ReqArt = require('./Artghos');
const pkg = require('./package.json');
const fs = require('fs');
const path = require('path');

// Check and configure secret key on first execution
const configPath = path.join(process.cwd(), 'artghos.config.json');
if (!fs.existsSync(configPath)) {
  console.log('\n🔐 Initial Artghos security configuration');
  console.log('Generating secret key for digital package signing...');
  ReqArt.ArtPacker.setupSecretKey();
  console.log('✅ Configuration complete! This key will be used for all packages.\n');
}

const args = process.argv.slice(2);
const command = args[0];

if (command === '--version' || command === '-v') {
  console.log(`artghos v${pkg.version}`);
  process.exit(0);
}

if (command === '--help' || command === '-h') {
  console.log(`
Artghos v${pkg.version} - Secure packaging system for Node.js packages

Usage:
  artghos install <package> [version]   Downloads and packages an npm package
  artghos install <p1> <p2> ...         Packages multiple packages (e.g.: express lodash bcrypt)
  artghos install name@version          Compact form (e.g.: express@4.18.0)
  artghos --version, -v                 Shows version
  artghos --help, -h                    Shows this help

Security flags:
  --force-pack                          Forces packaging ignoring warnings
  --force-unpack                        Forces unpacking ignoring warnings

Examples:
  artghos install lodash
  artghos install express 4.18.0
  artghos install axios latest
  artghos install express --force-pack

🔒 Security:
  All packages are checked for malicious content
  and digitally signed to ensure integrity.
  `);
  process.exit(0);
}

if (command !== 'install' || !args[1]) {
  console.log('Usage: artghos install <package> [version]');
  console.log('       artghos install <p1> <p2> ...');
  console.log('       artghos install name@version');
  console.log('Use artghos --help for more information');
  process.exit(1);
}

// Supports multiple packages and name@version forms
const packages = [];
for (let i = 1; i < args.length; i++) {
  const token = args[i];
  if (token.startsWith('--')) continue; // flags are read by Artghos.js via process.argv
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
  console.log('No valid packages specified.');
  process.exit(1);
}

(async () => {
  let ok = 0;
  for (const { name, version } of packages) {
    try {
      console.log(`Packaging ${name}@${version}...`);
      const out = ReqArt.install(name, version);
      console.log(`✓ Completed: ${out}`);
      ok++;
    } catch (err) {
      console.error(`Error packaging ${name}: ${err.message}`);
    }
  }
  if (ok === 0) process.exit(1);
})();