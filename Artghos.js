const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execSync } = require('child_process');
const { createRequire } = require('module');
const crypto = require('crypto');

class ArtPacker {
  // Chave secreta para assinatura (em produção, deve ser armazenada de forma segura)
  static getSecretKey() {
    // Em produção, isso deve vir de uma variável de ambiente ou arquivo seguro
    return 'artghos-security-key-2023';
  }

  // Gera uma assinatura digital para o conteúdo
  static createSignature(content) {
    const hmac = crypto.createHmac('sha256', this.getSecretKey());
    hmac.update(content);
    return hmac.digest('hex');
  }

  // Verifica a assinatura digital
  static verifySignature(content, signature) {
    const expectedSignature = this.createSignature(content);
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    );
  }

  // Verifica se o conteúdo contém padrões maliciosos
  static scanForMaliciousContent(content) {
    // Lista de padrões suspeitos (simplificada)
    const suspiciousPatterns = [
      /eval\s*\(/i,                    // eval()
      /new\s+Function\s*\(/i,          // new Function()
      /<script>/i,                     // <script> tags
      /document\.write/i,              // document.write
      /\bexec\s*\(/i,                  // exec()
      /\bchild_process\b/i,            // child_process
      /\bfs\s*\.\s*(write|append)/i,   // fs.write/append
      /\brequire\s*\(\s*['"]child_process['"]\s*\)/i, // require('child_process')
      /\bprocess\s*\.\s*env\b/i,       // process.env
      /\bcrypto\s*\.\s*subtle\b/i      // crypto.subtle
    ];

    // Verifica cada padrão
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        return {
          isSuspicious: true,
          reason: `Padrão suspeito detectado: ${pattern}`
        };
      }
    }

    return { isSuspicious: false };
  }

  static pack(sourceDir, outputFile) {
    const files = this.collectFiles(sourceDir);
    const data = {
      files: {},
      metadata: {
        created: new Date().toISOString(),
        fileCount: files.length,
        packageName: path.basename(sourceDir)
      }
    };

    // Verificar arquivos maliciosos antes de empacotar
    const suspiciousFiles = [];
    
    files.forEach(filePath => {
      const relativePath = path.relative(sourceDir, filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Verificar conteúdo malicioso
      const scanResult = this.scanForMaliciousContent(content);
      if (scanResult.isSuspicious) {
        suspiciousFiles.push({
          file: relativePath,
          reason: scanResult.reason
        });
      }
      
      data.files[relativePath] = Buffer.from(content).toString('base64');
    });

    // Se encontrou arquivos suspeitos, aborta o empacotamento
    if (suspiciousFiles.length > 0) {
      console.error('⚠️ Arquivos suspeitos detectados:');
      suspiciousFiles.forEach(file => {
        console.error(`  - ${file.file}: ${file.reason}`);
      });
      throw new Error('Empacotamento abortado devido a conteúdo suspeito');
    }

    const json = JSON.stringify(data);
    
    // Adicionar assinatura digital
    const signature = this.createSignature(json);
    const secureData = {
      data: json,
      signature: signature,
      version: '1.0'
    };
    
    const secureJson = JSON.stringify(secureData);
    const compressed = zlib.gzipSync(secureJson);

    fs.writeFileSync(outputFile, compressed);
    console.log(`✓ Pacote assinado digitalmente: ${outputFile}`);
  }

  static unpack(artFile, targetDir) {
    const compressed = fs.readFileSync(artFile);
    const secureJson = zlib.gunzipSync(compressed).toString();
    let secureData;
    
    try {
      secureData = JSON.parse(secureJson);
    } catch (error) {
      throw new Error(`Arquivo .art inválido: ${error.message}`);
    }
    
    // Verificar se é um arquivo .art seguro
    if (!secureData.signature || !secureData.data) {
      throw new Error('Arquivo .art não possui assinatura digital');
    }
    
    // Verificar assinatura
    try {
      const isValid = this.verifySignature(secureData.data, secureData.signature);
      if (!isValid) {
        throw new Error('Assinatura digital inválida. O arquivo pode ter sido adulterado.');
      }
    } catch (error) {
      throw new Error(`Erro ao verificar assinatura: ${error.message}`);
    }
    
    // Desempacotar dados
    const data = JSON.parse(secureData.data);

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
      
      // Verificação adicional de segurança para arquivos JavaScript
      if (relativePath.endsWith('.js') || relativePath.endsWith('.mjs')) {
        const contentStr = content.toString('utf8');
        const scanResult = this.scanForMaliciousContent(contentStr);
        if (scanResult.isSuspicious) {
          throw new Error(`Arquivo suspeito detectado: ${relativePath} - ${scanResult.reason}`);
        }
      }
      
      fs.writeFileSync(fullPath, content);
    });

    console.log(`✓ Verificação de integridade concluída: ${artFile}`);
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
  // Resolve o caminho automaticamente
  let resolvedPath = artPath;

  // Se não termina com .art e não é um caminho absoluto/relativo, adiciona o diretório padrão
  if (!artPath.endsWith('.art') && !artPath.startsWith('./') && !artPath.startsWith('../') && !path.isAbsolute(artPath)) {
    resolvedPath = path.join('./art-packages', `${artPath}.art`);
  }

  if (artModuleCache.has(resolvedPath)) {
    return artModuleCache.get(resolvedPath);
  }

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Arquivo ${resolvedPath} não encontrado`);
  }

  const tempExtractDir = path.join('./art-packages', '.reqart-temp', path.basename(resolvedPath, '.art'));

  if (fs.existsSync(tempExtractDir)) {
    fs.rmSync(tempExtractDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempExtractDir, { recursive: true });

  ArtPacker.unpack(resolvedPath, tempExtractDir);

  const pkgJsonPath = path.join(tempExtractDir, 'package.json');
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  const entryPoint = path.resolve(tempExtractDir, pkgJson.main || 'index.js');

  // Verificar se o módulo é ESM ou CommonJS
  const isESM = pkgJson.type === 'module' || 
                entryPoint.endsWith('.mjs') || 
                (fs.existsSync(entryPoint) && 
                 fs.readFileSync(entryPoint, 'utf8').includes('export '));

  let loadedModule;

  if (isESM) {
    // Para módulos ESM, usamos dynamic import
    const importPath = `file://${entryPoint.replace(/\\/g, '/')}`;
    
    // Como dynamic import é assíncrono, precisamos usar uma abordagem síncrona
    // Criamos um arquivo temporário para carregar o módulo ESM
    const tempLoaderPath = path.join(tempExtractDir, '_temp_esm_loader.cjs');
    const loaderContent = `
      const { pathToFileURL } = require('url');
      const fs = require('fs');
      
      async function loadModule() {
        try {
          const module = await import(pathToFileURL('${entryPoint.replace(/\\/g, '\\\\')}'));
          fs.writeFileSync('${path.join(tempExtractDir, '_esm_result.json').replace(/\\/g, '\\\\')}', 
                          JSON.stringify({ success: true, isObject: typeof module === 'object' }));
        } catch (error) {
          fs.writeFileSync('${path.join(tempExtractDir, '_esm_result.json').replace(/\\/g, '\\\\')}', 
                          JSON.stringify({ success: false, error: error.message }));
        }
      }
      
      loadModule();
    `;
    
    fs.writeFileSync(tempLoaderPath, loaderContent);
    
    try {
      execSync(`node "${tempLoaderPath}"`, { stdio: 'ignore' });
      
      // Verificar o resultado
      const resultPath = path.join(tempExtractDir, '_esm_result.json');
      if (fs.existsSync(resultPath)) {
        const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
        
        if (result.success) {
          // Como não podemos retornar o módulo ESM diretamente (é assíncrono),
          // retornamos um proxy que avisa o usuário que precisa usar await
          loadedModule = {
            __artghosESMModule: true,
            __modulePath: importPath,
            async import() {
              return import(importPath);
            },
            // Método para facilitar o uso
            toString() {
              return '[Artghos ESM Module] Use await module.import() para carregar este módulo ESM';
            }
          };
        } else {
          throw new Error(`Erro ao carregar módulo ESM: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar módulo ESM:', error);
      // Fallback para CommonJS se falhar
      const customRequire = createRequire(__filename);
      loadedModule = customRequire(entryPoint);
    }
  } else {
    // Para módulos CommonJS, usamos require normal
    loadedModule = require(entryPoint);
    
    // FIX: Lidar com módulos que exportam como { default: ... }
    if (loadedModule && typeof loadedModule === 'object' && loadedModule.default) {
      loadedModule = loadedModule.default;
    }
  }

  artModuleCache.set(resolvedPath, loadedModule);

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

ReqArt.ArtPacker = ArtPacker;
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
