#!/usr/bin/env node
/** Build the vendored replay-editor TypeScript copy into .cache/. */

import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'third_party', 'replay-editor');
const output = path.join(root, '.cache', 'replay-editor');

execFileSync('tsc', [
    '-p', path.join(source, 'tsconfig.json'),
    '--noEmit', 'false',
    '--outDir', output,
    '--rootDir', source,
], {stdio: 'inherit'});

// Node 20 must recognize the emitted .js files as ES modules explicitly.
fs.writeFileSync(path.join(output, 'package.json'), '{"type":"module"}\n');

// TypeScript's ES2022 output keeps extensionless relative imports. Add .js so
// the generated modules are directly executable by Node's native ESM loader.
const importPattern = /(from\s+['"]|import\s*\(\s*['"])(\.\.?\/[^'"]+)(['"])/g;
for (const file of fs.readdirSync(output, {recursive: true})) {
    if (!String(file).endsWith('.js')) continue;
    const target = path.join(output, String(file));
    const sourceText = fs.readFileSync(target, 'utf8');
    const fixed = sourceText.replace(importPattern, (_, prefix, specifier, suffix) =>
        `${prefix}${specifier.endsWith('.js') ? specifier : `${specifier}.js`}${suffix}`);
    fs.writeFileSync(target, fixed);
}

console.log(`PASS replay-editor build: ${output}`);
