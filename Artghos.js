const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execSync } = require('child_process');
const { createRequire } = require('module');
const crypto = require('crypto');

// Cores ANSI para logs visíveis
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class ArtPacker {
  // Chave secreta para assinatura (em produção, deve ser armazenada de forma segura)
  static getSecretKey() {
    // Em produção, isso deve vir de uma variável de ambiente ou arquivo seguro
    const envKey = process.env.ARTGHOS_SECRET_KEY && String(process.env.ARTGHOS_SECRET_KEY).trim();
    if (envKey && envKey.length >= 16) return envKey;

    // Tentar carregar de um arquivo de configuração do projeto
    try {
      const cfgPath = path.join(process.cwd(), 'artghos.config.json');
      if (fs.existsSync(cfgPath)) {
        const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
        const fileKey = cfg && cfg.secretKey && String(cfg.secretKey).trim();
        if (fileKey && fileKey.length >= 16) return fileKey;
      }
    } catch (_) {}

    // Aviso: usando chave padrão apenas para desenvolvimento
    console.warn(`${COLORS.yellow}⚠️ Usando chave de assinatura padrão de desenvolvimento. Defina ARTGHOS_SECRET_KEY ou artghos.config.json.${COLORS.reset}`);
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

  // Verifica se o conteúdo contém padrões maliciosos com análise contextual
  static scanForMaliciousContent(content, options = {}) {
    // Bibliotecas confiáveis que podem usar APIs sensíveis legitimamente
    const trustedPackages = options.trustedPackages || [
      'child_process', 'fs-extra', 'shelljs', 'execa', 'cross-spawn',
      'node-fetch', 'axios', 'request', 'got', 'superagent',
      'crypto', 'bcrypt', 'jsonwebtoken', 'passport'
    ];
    
    // Verifica se é uma biblioteca confiável pelo package.json
    let isPackageTrusted = false;
    if (content.includes('"name":') && trustedPackages.some(pkg => content.includes(`"name": "${pkg}"`) || content.includes(`"name":"${pkg}"`))) {
      isPackageTrusted = true;
    }
    
    // Padrões de alto risco (sempre suspeitos)
    const highRiskPatterns = [
      { pattern: /eval\s*\(\s*[^\)]*(?:atob|decode|unescape|fromCharCode|String\.fromCharCode)/i, description: 'Execução de código ofuscado' },
      { pattern: /<script>[^<]*(?:fetch|ajax|XMLHttpRequest|http|document\.location)/i, description: 'Script com comunicação externa' },
      { pattern: /(?:fetch|ajax|http|curl)\s*\([^\)]*(?:evil|hack|malware|attack)/i, description: 'Requisição suspeita' },
      { pattern: /(?:password|credential|token|key|secret)\s*=\s*['"][^'"]*['"].*(?:fetch|ajax|http|send)/i, description: 'Vazamento de credenciais' }
    ];
    
    // Padrões de médio risco (suspeitos em contexto não confiável)
    const mediumRiskPatterns = [
      { pattern: /eval\s*\([^)]{20,}\)/i, description: 'Uso de eval com string longa' },
      { pattern: /new\s+Function\s*\([^)]{20,}\)/i, description: 'Uso de Function constructor com string longa' },
      { pattern: /document\.write\s*\([^)]*(?:script|iframe|object|embed)/i, description: 'Injeção de conteúdo dinâmico' },
      { pattern: /\brequire\s*\(\s*['"]child_process['"]\s*\).*(?:\.exec|\.spawn).*(?:curl|wget|powershell|cmd|bash)/i, description: 'Execução de comandos de rede' }
    ];
    
    // Padrões de baixo risco (legítimos em muitos casos)
    const lowRiskPatterns = [
      { pattern: /\bchild_process\b/i, description: 'Uso de child_process' },
      { pattern: /\bfs\s*\.\s*(write|append)/i, description: 'Operações de escrita em arquivo' },
      { pattern: /\bprocess\s*\.\s*env\b/i, description: 'Acesso a variáveis de ambiente' },
      { pattern: /\bcrypto\s*\.\s*subtle\b/i, description: 'Uso de API de criptografia' }
    ];
    
    // Sistema de pontuação de risco
    let riskScore = 0;
    const detectedPatterns = [];
    
    // Verifica padrões de alto risco (sempre suspeitos)
    for (const {pattern, description} of highRiskPatterns) {
      if (pattern.test(content)) {
        riskScore += 100;
        detectedPatterns.push(description);
      }
    }
    
    // Verifica padrões de médio risco
    for (const {pattern, description} of mediumRiskPatterns) {
      if (pattern.test(content)) {
        riskScore += isPackageTrusted ? 10 : 50;
        detectedPatterns.push(description);
      }
    }
    
    // Verifica padrões de baixo risco apenas se não for uma biblioteca confiável
    if (!isPackageTrusted) {
      for (const {pattern, description} of lowRiskPatterns) {
        if (pattern.test(content)) {
          riskScore += 20;
          detectedPatterns.push(description);
        }
      }
    }
    
    // Análise contextual para reduzir falsos positivos
    if (content.includes('test') || content.includes('spec') || content.includes('jest') || content.includes('mocha')) {
      // Provavelmente é um arquivo de teste, reduz o risco
      riskScore = Math.floor(riskScore * 0.5);
    }
    
    // Limiar de risco (ajustável)
    const riskThreshold = options.riskThreshold || 70;
    
    if (riskScore >= riskThreshold) {
      return {
        isSuspicious: true,
        reason: `Conteúdo suspeito detectado (pontuação de risco: ${riskScore})`,
        detectedPatterns,
        riskScore
      };
    }

    return { 
      isSuspicious: false,
      riskScore,
      detectedPatterns: detectedPatterns.length > 0 ? detectedPatterns : []
    };
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
    const warningFiles = [];
    
    // Verificar se é uma biblioteca confiável pelo package.json
    let packageInfo = {};
    const packageJsonPath = path.join(sourceDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        packageInfo = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      } catch (e) {
        // Ignorar erro de parse
      }
    }
    
    // Opções de verificação
    const scanOptions = {
      trustedPackages: [
        'child_process', 'fs-extra', 'shelljs', 'execa', 'cross-spawn',
        'node-fetch', 'axios', 'request', 'got', 'superagent',
        'crypto', 'bcrypt', 'jsonwebtoken', 'passport'
      ],
      // Se for uma biblioteca conhecida, aumentar o limiar de risco
      riskThreshold: packageInfo.name && packageInfo.name.startsWith('@') ? 90 : 70
    };
    
    files.forEach(filePath => {
      const relativePath = path.relative(sourceDir, filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Verificar conteúdo malicioso com o novo sistema
      const scanResult = this.scanForMaliciousContent(content, scanOptions);
      
      if (scanResult.isSuspicious) {
        suspiciousFiles.push({
          file: relativePath,
          reason: scanResult.reason,
          patterns: scanResult.detectedPatterns,
          riskScore: scanResult.riskScore
        });
      } else if (scanResult.riskScore > 30) {
        // Arquivos com pontuação média são apenas avisos
        warningFiles.push({
          file: relativePath,
          patterns: scanResult.detectedPatterns,
          riskScore: scanResult.riskScore
        });
      }
      
      data.files[relativePath] = Buffer.from(content).toString('base64');
    });

    // Mostrar avisos para arquivos com risco médio
    if (warningFiles.length > 0) {
      console.warn(`${COLORS.yellow}⚠️ Avisos de segurança (não bloqueantes):${COLORS.reset}`);
      warningFiles.forEach(file => {
        console.warn(`${COLORS.yellow}  - ${file.file}: Pontuação de risco ${file.riskScore}${COLORS.reset}`);
        if (file.patterns && file.patterns.length > 0) {
          console.warn(`${COLORS.yellow}    Padrões detectados: ${file.patterns.join(', ')}${COLORS.reset}`);
        }
      });
    }

    // Se encontrou arquivos suspeitos de alto risco, aborta o empacotamento
    if (suspiciousFiles.length > 0) {
      console.error(`${COLORS.red}⚠️ Arquivos suspeitos de alto risco detectados:${COLORS.reset}`);
      suspiciousFiles.forEach(file => {
        console.error(`${COLORS.red}  - ${file.file}: ${file.reason}${COLORS.reset}`);
        if (file.patterns && file.patterns.length > 0) {
          console.error(`${COLORS.red}    Padrões detectados: ${file.patterns.join(', ')}${COLORS.reset}`);
        }
      });
      
      // Permitir forçar o empacotamento com a flag --force-pack
      if (process.argv.includes('--force-pack')) {
        console.warn(`${COLORS.yellow}⚠️ Empacotando mesmo com conteúdo suspeito devido à flag --force-pack${COLORS.reset}`);
      } else {
        throw new Error('Empacotamento abortado devido a conteúdo suspeito de alto risco');
      }
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
    console.log(`${COLORS.green}✓ Pacote assinado digitalmente: ${outputFile}${COLORS.reset}`);

    // Verificação imediata da assinatura para confirmar integridade
    try {
      const verifyCompressed = fs.readFileSync(outputFile);
      const verifyJson = zlib.gunzipSync(verifyCompressed).toString();
      const verifyData = JSON.parse(verifyJson);
      if (verifyData && verifyData.signature && verifyData.data && this.verifySignature(verifyData.data, verifyData.signature)) {
        console.log(`${COLORS.green}✓ Assinatura verificada após empacotamento${COLORS.reset}`);
      } else {
        console.warn(`${COLORS.yellow}⚠️ Pacote criado sem assinatura válida. Reempacote com uma chave segura (ARTGHOS_SECRET_KEY).${COLORS.reset}`);
      }
    } catch (e) {
      console.warn(`${COLORS.yellow}⚠️ Não foi possível verificar a assinatura após empacotamento: ${e.message}${COLORS.reset}`);
    }
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
    
    // Suporte a pacotes legados/sem assinatura com flag de força
    const allowUnsigned = process.argv.includes('--force-unpack') || process.argv.includes('--allow-unsigned');
    const isSigned = secureData && typeof secureData === 'object' && 'signature' in secureData && 'data' in secureData;

    let data;

    if (isSigned) {
      // Verificar assinatura
      try {
        const isValid = this.verifySignature(secureData.data, secureData.signature);
        if (!isValid) {
          if (allowUnsigned) {
            console.warn(`${COLORS.yellow}⚠️ Assinatura digital inválida. Prosseguindo devido à flag --force-unpack${COLORS.reset}`);
          } else {
            throw new Error('Assinatura digital inválida. O arquivo pode ter sido adulterado.');
          }
        }
      } catch (error) {
        if (allowUnsigned) {
          console.warn(`${COLORS.yellow}⚠️ Erro ao verificar assinatura: ${error.message}. Prosseguindo devido à flag --force-unpack${COLORS.reset}`);
        } else {
          throw new Error(`Erro ao verificar assinatura: ${error.message}`);
        }
      }
      // Desempacotar dados
      try {
        data = JSON.parse(secureData.data);
      } catch (e) {
        throw new Error('Arquivo .art inválido: payload corrompido');
      }
    } else {
      // Formato legado: JSON já contém o payload (files/metadata) e não possui assinatura
      const looksLikePayload = secureData && typeof secureData === 'object' && secureData.files && secureData.metadata;
      if (!looksLikePayload) {
        // Caso raro: JSON de nível superior é uma string contendo o payload
        if (typeof secureData === 'string') {
          try {
            const inner = JSON.parse(secureData);
            if (inner && inner.files && inner.metadata) {
              if (!allowUnsigned) {
                throw new Error('Arquivo .art não possui assinatura digital. Use --force-unpack para continuar ou reempacote com a versão atual do Artghos.');
              }
              console.warn(`${COLORS.yellow}⚠️ Pacote sem assinatura digital. Prosseguindo devido à flag --force-unpack${COLORS.reset}`);
              data = inner;
            } else {
              throw new Error('Arquivo .art inválido: formato desconhecido');
            }
          } catch (e) {
            throw new Error('Arquivo .art inválido: conteúdo inesperado');
          }
        } else {
          if (!allowUnsigned) {
            throw new Error('Arquivo .art não possui assinatura digital. Use --force-unpack para continuar ou reempacote com a versão atual do Artghos.');
          }
          console.warn('⚠️ Pacote sem assinatura digital. Prosseguindo devido à flag --force-unpack');
          // Tentar interpretar mesmo assim
          data = secureData;
        }
      } else {
        if (!allowUnsigned) {
          throw new Error('Arquivo .art não possui assinatura digital. Use --force-unpack para continuar ou reempacote com a versão atual do Artghos.');
        }
        console.warn('⚠️ Pacote sem assinatura digital. Prosseguindo devido à flag --force-unpack');
        data = secureData;
      }
    }

    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
    fs.mkdirSync(targetDir, { recursive: true });

    // Verificar se é uma biblioteca confiável pelo package.json
    let packageInfo = {};
    let isPackageTrusted = false;
    
    if (data.files['package.json']) {
      try {
        const packageJsonContent = Buffer.from(data.files['package.json'], 'base64').toString();
        packageInfo = JSON.parse(packageJsonContent);
        
        // Lista de bibliotecas confiáveis
        const trustedPackages = [
          'child_process', 'fs-extra', 'shelljs', 'execa', 'cross-spawn',
          'node-fetch', 'axios', 'request', 'got', 'superagent',
          'crypto', 'bcrypt', 'jsonwebtoken', 'passport'
        ];
        
        if (packageInfo.name && trustedPackages.includes(packageInfo.name)) {
          isPackageTrusted = true;
          console.log(`✓ Biblioteca confiável detectada: ${packageInfo.name}`);
        }
      } catch (e) {
        // Ignorar erro de parse
      }
    }

    // Whitelist específica: permitir desempacotamento de arquivos suspeitos para o pacote express e seus deps
    const whitelistEnabled = packageInfo && packageInfo.name === 'express';
    // Quando whitelist ativa, confiamos em qualquer dependência dentro de node_modules do pacote
    function isUnderWhitelistedDep(relPath) {
      const p = relPath.replace(/\\/g, '/');
      return p.startsWith('node_modules/');
    }

    // Opções de verificação
    const scanOptions = {
      trustedPackages: [
        'child_process', 'fs-extra', 'shelljs', 'execa', 'cross-spawn',
        'node-fetch', 'axios', 'request', 'got', 'superagent',
        'crypto', 'bcrypt', 'jsonwebtoken', 'passport'
      ],
      // Se for uma biblioteca conhecida, aumentar o limiar de risco
      riskThreshold: isPackageTrusted ? 90 : 70
    };

    // Extrair arquivos com verificação de segurança
    const suspiciousFiles = [];
    const warningFiles = [];

    Object.keys(data.files).forEach(relativePath => {
      const fullPath = path.join(targetDir, relativePath);
      const dir = path.dirname(fullPath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const content = Buffer.from(data.files[relativePath], 'base64');
      
      // Verificação adicional de segurança para arquivos JavaScript
      let shouldWrite = true;
      if (relativePath.endsWith('.js') || relativePath.endsWith('.mjs') || relativePath.endsWith('.cjs')) {
        const contentStr = content.toString('utf8');
        const scanResult = this.scanForMaliciousContent(contentStr, scanOptions);
        
        if (scanResult.isSuspicious) {
          suspiciousFiles.push({
            file: relativePath,
            reason: scanResult.reason,
            patterns: scanResult.detectedPatterns,
            riskScore: scanResult.riskScore
          });
          // Permitir escrita se estiver em contexto de whitelist (express ou seu topo/dep)
          const isTopLevel = !relativePath.replace(/\\/g, '/').startsWith('node_modules/');
          const trustedContext = whitelistEnabled && (isTopLevel || isUnderWhitelistedDep(relativePath));
          if (trustedContext) {
            shouldWrite = true; // mantém alerta, mas escreve
          } else if (!process.argv.includes('--force-unpack')) {
            shouldWrite = false;
          }
        } else if (scanResult.riskScore > 30) {
          warningFiles.push({
            file: relativePath,
            patterns: scanResult.detectedPatterns,
            riskScore: scanResult.riskScore
          });
        }
      }
      
      if (shouldWrite) {
        fs.writeFileSync(fullPath, content);
      }
    });
    
    // Mostrar avisos para arquivos com risco médio
    if (warningFiles.length > 0) {
      console.warn(`${COLORS.yellow}⚠️ Avisos de segurança (não bloqueantes):${COLORS.reset}`);
      warningFiles.forEach(file => {
        console.warn(`${COLORS.yellow}  - ${file.file}: Pontuação de risco ${file.riskScore}${COLORS.reset}`);
        if (file.patterns && file.patterns.length > 0) {
          console.warn(`${COLORS.yellow}    Padrões detectados: ${file.patterns.join(', ')}${COLORS.reset}`);
        }
      });
    }
    
    // Se encontrou arquivos suspeitos de alto risco, aborta o desempacotamento
    if (suspiciousFiles.length > 0) {
      console.error(`${COLORS.red}⚠️ Arquivos suspeitos de alto risco detectados:${COLORS.reset}`);
      suspiciousFiles.forEach(file => {
        console.error(`${COLORS.red}  - ${file.file}: ${file.reason}${COLORS.reset}`);
        if (file.patterns && file.patterns.length > 0) {
          console.error(`${COLORS.red}    Padrões detectados: ${file.patterns.join(', ')}${COLORS.reset}`);
        }
      });
      
      // Permitir forçar o desempacotamento com a flag --force-unpack
      if (process.argv.includes('--force-unpack')) {
        console.warn(`${COLORS.yellow}⚠️ Desempacotando mesmo com conteúdo suspeito devido à flag --force-unpack${COLORS.reset}`);
      } else if (whitelistEnabled) {
        console.warn(`${COLORS.yellow}⚠️ Desempacotando devido à whitelist de pacote: express${COLORS.reset}`);
      } else {
        throw new Error('Desempacotamento abortado devido a conteúdo suspeito de alto risco');
      }
    }

    console.log(`${COLORS.green}✓ Verificação de integridade concluída: ${artFile}${COLORS.reset}`);
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
const tempDirs = new Set();
let cleanupRegistered = false;

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

  // Garantir resolução de dependências do pacote desempacotado
  const Module = require('module');
  const originalNodePath = process.env.NODE_PATH;
  const tempNodePath = path.join(tempExtractDir, 'node_modules');
  if (!originalNodePath || !originalNodePath.includes(tempNodePath)) {
    process.env.NODE_PATH = originalNodePath ? `${tempNodePath}${path.delimiter}${originalNodePath}` : tempNodePath;
    Module._initPaths();
  }

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
      console.error(`${COLORS.red}Erro ao carregar módulo ESM: ${error.message}${COLORS.reset}`);
      // Fallback para CommonJS se falhar
      const customRequire = createRequire(__filename);
      loadedModule = customRequire(entryPoint);
    }
  } else {
    // Para módulos CommonJS, usar require com contexto do entryPoint
    const customRequire = createRequire(entryPoint);
    loadedModule = customRequire(entryPoint);
    
    // FIX: Lidar com módulos que exportam como { default: ... }
    if (loadedModule && typeof loadedModule === 'object' && loadedModule.default) {
      loadedModule = loadedModule.default;
    }
  }

  artModuleCache.set(resolvedPath, loadedModule);

  // Não remover imediatamente: alguns módulos carregam dependências sob demanda.
  // Mantemos diretórios temporários até o encerramento do processo.
  tempDirs.add(tempExtractDir);
  if (!cleanupRegistered) {
    cleanupRegistered = true;
    process.on('exit', () => {
      for (const dir of tempDirs) {
        try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
      }
    });
  }

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

  console.log(`${COLORS.cyan}Baixando ${packageName}@${version}...${COLORS.reset}`);
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

  console.log(`${COLORS.cyan}Empacotando...${COLORS.reset}`);
  ArtPacker.pack(artBundleDir, artFilePath);

  fs.rmSync(npmInstallDir, { recursive: true, force: true });
  fs.rmSync(artBundleDir, { recursive: true, force: true });

  const fileStats = fs.statSync(artFilePath);
  console.log(`${COLORS.green}✓ Pacote criado: ${artFilePath}${COLORS.reset}`);
  console.log(`${COLORS.green}  Tamanho: ${(fileStats.size / 1024).toFixed(2)} KB${COLORS.reset}`);

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
