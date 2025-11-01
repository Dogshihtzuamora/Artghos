# Artghos

Node.js package bundling and loading system in `.art` format with ESM/CommonJS support and advanced security features.

## 📦 What is it?

Artghos allows you to bundle any npm package (with all its dependencies) into a single compressed `.art` file, which can be distributed and loaded without internet access or npm install. Now with full support for ESM and CommonJS modules, plus a robust security system against malware.

## 🚀 Installation

### Global Usage
```bash
npm install -g artghos
```

### Local Usage
```bash
npm install artghos
```

## 📝 How to use

### Create an .art package

```bash
artghos install <package-name> [version]
```

**Examples:**
```bash
artghos install express
artghos install express 4.18.0
artghos install lodash latest
artghos install hyperswarm
 
# Multiple packages in a single command
artghos install express lodash bcrypt

# Compact form with version
artghos install express@4.18.0 lodash@latest
```

This generates an `.art` file in `./art-packages/`

### Load an .art package

```javascript
const ReqArt = require('artghos');

// Simplified form (automatically searches in art-packages/)
const express = ReqArt('express');

// Or with full path
const lodash = ReqArt('./art-packages/lodash.art');

// Use normally
const app = express();
app.get('/', (req, res) => res.send('Hello via .art!'));
app.listen(3000);
```

### Important notes
- `express` has an active security whitelist: files marked as "high risk" within the package and in `node_modules/` are written and the process doesn't abort. Warnings remain in the logs.
- For other packages, if the scanner marks high risk, run your script with `--force-unpack` to allow writing the files and proceed.

## ✨ Advantages

- ✅ **Portable**: A single file with everything included
- ✅ **Offline**: Works without internet or npm
- ✅ **Zero dependencies**: Uses only native Node.js modules
- ✅ **Smart caching**: Instant loading after first time
- ✅ **Gzip compression**: Smaller and efficient files
- ✅ **Full ESM/CommonJS support**: Automatic detection and dynamic loading
- ✅ **Advanced security system**: Protection against malware and tampering
- ✅ **Digital signature**: Package integrity verification
- ✅ **Contextual analysis**: Intelligent malicious code detection

## 🔒 Security System

Artghos includes an advanced security system to protect against malware:

- **Digital signature**: Each .art file is digitally signed to ensure integrity
- **Integrity verification**: Detects any tampering in packages
- **Contextual analysis**: Intelligent system that differentiates legitimate code from malicious
- **Risk scoring**: Assessment based on multiple security factors
- **Library whitelist**: Allows legitimate use of sensitive APIs by trusted libraries

### Security flags

```bash
# Force packaging even with security warnings
artghos install express --force-pack

# Force unpacking even with security warnings
node your-script.js --force-unpack
```

### Digital Signature and Secret Key
- Every `.art` is digitally signed (HMAC-SHA256) during packaging.
- On first execution, a random secret key is automatically generated.
- Secret key priority:
  1. `ARTGHOS_SECRET_KEY` (environment variable)
  2. `artghos.config.json` (in the root, automatically generated)
  3. Default development key (only if previous options fail)
- After packaging, the signature is verified to confirm integrity.

The `artghos.config.json` file is automatically created on first execution:
```json
{
  "secretKey": "automatically-generated-random-key"
}
```

#### Manual Key Configuration (optional)
If you prefer to define your own key, you can:
1. Edit the `artghos.config.json` file directly
2. Set the `ARTGHOS_SECRET_KEY` environment variable

```bash
# PowerShell (current session)
$env:ARTGHOS_SECRET_KEY="my-custom-key"

# PowerShell (permanent)
setx ARTGHOS_SECRET_KEY "my-custom-key"
```

### Behavior with Suspicious Content
- Packaging: high-risk files abort, unless `--force-pack` is used.
- Unpacking:
  - By default, high-risk files abort; with `--force-unpack`, they are written.
  - For `express`, there's a whitelist: unpacks without `--force-unpack`, keeping warnings for auditing.

## 🔄 ESM and CommonJS Support

Artghos now fully supports both CommonJS and ESM modules:

### CommonJS Modules (traditional)
```javascript
const ReqArt = require('artghos');
const lodash = ReqArt('lodash');
console.log(lodash.chunk([1, 2, 3, 4], 2));
```

### ESM Modules (import/export)
```javascript
const ReqArt = require('artghos');
const chalk = ReqArt('chalk');

// For ESM modules, use the import() method
const chalkModule = await chalk.import();
console.log(chalkModule.default.green('Success!'));
```

### Dependency Resolution and Temporary Directory
- Loading uses `createRequire` to ensure CommonJS module resolution relative to the entry point.
- The temporary extraction directory (`art-packages/.reqart-temp/<package>`) remains accessible until the process terminates, allowing on-demand dependency resolution.

## 📖 Examples

### Example with lodash (CommonJS)

```javascript
// Install lodash as .art
// $ artghos install lodash

// Use lodash from an .art file
const ReqArt = require('artghos');
const _ = ReqArt('lodash');

console.log(_.chunk(['a', 'b', 'c', 'd'], 2));
// => [['a', 'b'], ['c', 'd']]
```

### Example with express (CommonJS)

```javascript
// Install express as .art
// $ artghos install express

// Use express from an .art file
const ReqArt = require('artghos');
const express = ReqArt('express');

const app = express();
app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### Example with axios (CommonJS)

```javascript
// Install axios as .art
// $ artghos install axios

// Use axios from an .art file
const ReqArt = require('artghos');
const axios = ReqArt('axios');

async function getData() {
  const response = await axios.get('https://jsonplaceholder.typicode.com/todos/1');
  console.log(response.data);
}

getData();
```

### Example with React (ESM)

```javascript
// Install react as .art
// $ artghos install react

// Use react (ESM) from an .art file
const ReqArt = require('artghos');
const react = ReqArt('react');

// For ESM modules, use the import() method
async function example() {
  const React = await react.import();
  
  // Now you can use React normally
  const element = React.createElement('div', null, 'Hello, world!');
  console.log(element);
}

example();
```

### Example with trusted library using sensitive APIs

```javascript
// Install a trusted library that uses child_process
// $ artghos install cross-env

// The security system will allow packaging because it's a trusted library
const ReqArt = require('artghos');
const crossEnv = ReqArt('cross-env');

// Use normally
```

### Example with security flags

```bash
# Package forcing even with security warnings
artghos install lodash latest --force-pack

# Load forcing writing of files marked as high risk
node your-script.js --force-unpack
```

## ⚡ Performance

Artghos was designed to be fast and efficient:

- **Smart caching**: After the first load, modules are stored in cache
- **Efficient compression**: Reduces package size without compromising speed
- **Selective loading**: Loads only the necessary modules when requested

```
First load (no cache):     ~400-500ms
Subsequent loads (cache):  ~0.03ms (13,000x faster!)
```

In-memory caching makes subsequent loads practically instantaneous.

## 📄 License

MIT © Artghos

## 🎯 Use Cases

- 📦 Distribute applications with included dependencies
- 🌐 Offline development
- 🚀 Simplified deployment (copy a file vs npm install)
- 💾 Backup specific package versions
- 🔒 Environments without access to npm registry
- 🎮 Self-contained plugins and extensions

## 🛠️ Requirements

- Node.js v14 or higher
- npm (only for creating .art packages)

## 📁 File Structure

```
your-project/
├── art-packages/           # Created .art packages
│   ├── lodash.art
│   ├── express.art
│   └── axios.art
└── your-app.js
```

## 🔧 How It Works

1. **Creation**: Downloads npm package → bundles with dependencies → compresses with gzip
2. **Loading**: Decompresses → extracts files → loads module → keeps in cache
3. **Cache**: Loaded modules stay in memory for instant access
