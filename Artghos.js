const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execSync } = require('child_process');

class ArtPacker {
  static pack(sourceDir, outputFile) {
    const files = this.collectFiles(sourceDir);
    const data = {
      files: {},
      metadata: {
        created: new Date().toISOString(),
        fileCount: files.length
      }
    };

    files.forEach(filePath => {
      const relativePath = path.relative(sourceDir, filePath);
      const content = fs.readFileSync(filePath);
      data.files[relativePath] = content.toString('base64');
    });

    const json = JSON.stringify(data);
    const compressed = zlib.gzipSync(json);
    
    fs.writeFileSync(outputFile, compressed);
  }

  static unpack(artFile, targetDir) {
    const compressed = fs.readFileSync(artFile);
    const json = zlib.gunzipSync(compressed).toString();
    const data = JSON.parse(json);

    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
    fs.mkdirSync(targetDir, { recursive: true });

    Object.keys(data.files).forEach(relativePath => {
      const fullPath = path.join(targetDir, relativePath);
      const dir = path.dirname(fullPath);
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const content = Buffer.from(data.files[relativePath], 'base64');
      fs.writeFileSync(fullPath, content);
    });

    return data.metadata;
  }

  static collectFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        this.collectFiles(filePath, fileList);
      } else {
        fileList.push(filePath);
      }
    });

    return fileList;
  }
}

const artModuleCache = new Map();

function ReqArt(artPath) {
  if (artModuleCache.has(artPath)) {
    return artModuleCache.get(artPath);
  }

  if (!fs.existsSync(artPath)) {
    throw new Error(`Arquivo ${artPath} não encontrado`);
  }

  const tempExtractDir = path.join('./art-packages', '.reqart-temp', path.basename(artPath, '.art'));
  
  if (fs.existsSync(tempExtractDir)) {
    fs.rmSync(tempExtractDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempExtractDir, { recursive: true });

  ArtPacker.unpack(artPath, tempExtractDir);

  const pkgJsonPath = path.join(tempExtractDir, 'package.json');
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  const entryPoint = path.resolve(tempExtractDir, pkgJson.main || 'index.js');

  const loadedModule = require(entryPoint);
  
  artModuleCache.set(artPath, loadedModule);
  
  fs.rmSync(tempExtractDir, { recursive: true, force: true });
  
  return loadedModule;
}

ReqArt.install = function(packageName, version = 'latest') {
  const artOutputDir = './art-packages';
  const artTempDir = path.join(artOutputDir, '.temp');

  if (!fs.existsSync(artOutputDir)) fs.mkdirSync(artOutputDir, { recursive: true });
  if (!fs.existsSync(artTempDir)) fs.mkdirSync(artTempDir, { recursive: true });

  const npmInstallDir = path.join(artTempDir, 'install');

  if (fs.existsSync(npmInstallDir)) {
    fs.rmSync(npmInstallDir, { recursive: true, force: true });
  }
  fs.mkdirSync(npmInstallDir, { recursive: true });

  fs.writeFileSync(
    path.join(npmInstallDir, 'package.json'),
    JSON.stringify({ name: 'temp', version: '1.0.0' }, null, 2)
  );

  console.log(`Baixando ${packageName}@${version}...`);
  execSync(`npm install ${packageName}@${version}`, { cwd: npmInstallDir, stdio: 'inherit' });

  const nodeModulesDir = path.join(npmInstallDir, 'node_modules');

  if (!fs.existsSync(nodeModulesDir)) {
    throw new Error('node_modules não existe');
  }

  const artBundleDir = path.join(artTempDir, `${packageName}-bundle`);
  if (fs.existsSync(artBundleDir)) {
    fs.rmSync(artBundleDir, { recursive: true, force: true });
  }
  fs.mkdirSync(artBundleDir, { recursive: true });

  fs.cpSync(nodeModulesDir, path.join(artBundleDir, 'node_modules'), { recursive: true });

  const pkgJsonSource = path.join(nodeModulesDir, packageName, 'package.json');
  fs.cpSync(pkgJsonSource, path.join(artBundleDir, 'package.json'));

  const pkgSourceDir = path.join(nodeModulesDir, packageName);
  const pkgSourceFiles = fs.readdirSync(pkgSourceDir);
  pkgSourceFiles.forEach(file => {
    if (file !== 'package.json' && file !== 'node_modules') {
      const src = path.join(pkgSourceDir, file);
      const dest = path.join(artBundleDir, file);
      fs.cpSync(src, dest, { recursive: true });
    }
  });

  const artFileName = `${packageName.replace('/', '-')}.art`;
  const artFilePath = path.join(artOutputDir, artFileName);

  console.log('Empacotando...');
  ArtPacker.pack(artBundleDir, artFilePath);

  fs.rmSync(npmInstallDir, { recursive: true, force: true });
  fs.rmSync(artBundleDir, { recursive: true, force: true });

  const fileStats = fs.statSync(artFilePath);
  console.log(`✓ Pacote criado: ${artFilePath}`);
  console.log(`  Tamanho: ${(fileStats.size / 1024).toFixed(2)} KB`);

  return artFilePath;
};

module.exports = ReqArt;

if (require.main === module) {
  const packageName = process.argv[2];
  const version = process.argv[3] || 'latest';
  
  if (!packageName) {
    console.log('Uso: node index.js <pacote> [versao]');
    process.exit(1);
  }
  
  ReqArt.install(packageName, version);
}
