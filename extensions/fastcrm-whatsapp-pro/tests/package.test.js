import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { packageExtension, validatePackage } from '../scripts/package-extension.mjs';

const sourceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('pacote piloto inclui apenas os 19 ficheiros de execução, com manifest na raiz', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'fastcrm-package-'));
  try {
    const result = await packageExtension({ sourceDir, distDir: path.join(temp, 'dist'), zipPath: path.join(temp, 'pilot.zip') });
    assert.deepEqual(result.files, ['_locales/pt_PT/messages.json', 'background.js', 'icons/icon128.png', 'icons/icon16.png', 'icons/icon48.png', 'lib/extension-api.js', 'lib/messages.js', 'lib/oauth-client.js', 'lib/oauth-config.js', 'lib/oauth-pkce.js', 'lib/phone.js', 'lib/server-permission.js', 'lib/sw-handlers.js', 'lib/urls.js', 'lib/whatsapp-reader.js', 'manifest.json', 'sidepanel.css', 'sidepanel.html', 'sidepanel.js']);
    assert.equal((await validatePackage(result.distDir)).version, '0.7.2');
    assert.equal((await fs.readFile(path.join(result.distDir, 'sidepanel.html'), 'utf8')).match(/Versão ([0-9.]+) · piloto/)?.[1], (await validatePackage(result.distDir)).version);
    if (result.zip) {
      assert.ok(result.size > 0);
      assert.match(result.sha256, /^[a-f0-9]{64}$/);
      const second = await packageExtension({ sourceDir, distDir: path.join(temp, 'dist2'), zipPath: path.join(temp, 'pilot2.zip') });
      assert.equal(second.sha256, result.sha256);
    }
  } finally { await fs.rm(temp, { recursive: true, force: true }); }
});

test('validação recusa permissões adicionais e caminhos fora do pacote', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'fastcrm-invalid-'));
  try {
    const manifest = JSON.parse(await fs.readFile(path.join(sourceDir, 'manifest.json')));
    await fs.writeFile(path.join(temp, 'manifest.json'), JSON.stringify({ ...manifest, permissions: [...manifest.permissions, 'tabs'] }));
    await assert.rejects(validatePackage(temp), /Permissões inesperadas/);
    await fs.writeFile(path.join(temp, 'manifest.json'), JSON.stringify({ ...manifest, background: { service_worker: '../outside.js' } }));
    await assert.rejects(validatePackage(temp), /Caminho inválido/);
  } finally { await fs.rm(temp, { recursive: true, force: true }); }
});