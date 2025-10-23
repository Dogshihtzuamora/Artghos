const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const tar = require('tar');

const packageName = process.argv[2];
const version = process.argv[3] || 'latest';

if (!packageName) {
  console.log('Uso: node app.js <pacote> [versao]');
  process.exit(1);
}

const outputDir = './art-packages';
const tempDir = path.join(outputDir, '.temp');

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const installDir = path.join(tempDir, 'install');

if (fs.existsSync(installDir)) fs.rmSync(installDir, { recursive: true, force: true });
fs.mkdirSync(installDir, { recursive: true });

fs.writeFileSync(
  path.join(installDir, 'package.json'),
  JSON.stringify({ name: 'temp', version: '1.0.0' }, null, 2)
);

execSync(`npm install ${packageName}@${version}`, { cwd: installDir, stdio: 'inherit' });

const nodeModulesPath = path.join(installDir, 'node_modules');

if (!fs.existsSync(nodeModulesPath)) {
  console.error('node_modules não existe');
  process.exit(1);
}

const bundleDir = path.join(tempDir, `${packageName}-bundle`, 'package');
if (fs.existsSync(path.dirname(bundleDir))) fs.rmSync(path.dirname(bundleDir), { recursive: true, force: true });
fs.mkdirSync(bundleDir, { recursive: true });

fs.cpSync(nodeModulesPath, path.join(bundleDir, 'node_modules'), { recursive: true });

const packageJsonSrc = path.join(nodeModulesPath, packageName, 'package.json');
fs.cpSync(packageJsonSrc, path.join(bundleDir, 'package.json'));

const pkgSrc = path.join(nodeModulesPath, packageName);
const pkgFiles = fs.readdirSync(pkgSrc);
pkgFiles.forEach(file => {
  if (file !== 'package.json' && file !== 'node_modules') {
    const src = path.join(pkgSrc, file);
    const dest = path.join(bundleDir, file);
    fs.cpSync(src, dest, { recursive: true });
  }
});

const artFileName = `${packageName.replace('/', '-')}.art`;
const artFilePath = path.join(outputDir, artFileName);

tar.c({ gzip: true, file: artFilePath, cwd: path.dirname(bundleDir), sync: true }, ['package']);

fs.rmSync(installDir, { recursive: true, force: true });
fs.rmSync(path.dirname(bundleDir), { recursive: true, force: true });

console.log(`✓ Pacote criado: ${artFilePath}`);
