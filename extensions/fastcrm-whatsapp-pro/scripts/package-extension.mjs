import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixedFiles = ['manifest.json', 'background.js', 'sidepanel.html', 'sidepanel.js', 'sidepanel.css', 'lib/phone.js', 'lib/urls.js', 'lib/messages.js', 'lib/extension-api.js', 'lib/sw-handlers.js', 'lib/oauth-config.js', 'lib/oauth-client.js', 'lib/oauth-pkce.js', 'lib/server-permission.js', 'lib/whatsapp-reader.js', 'lib/tab-reuse.js'];
const timestamp = new Date('2026-01-01T00:00:00Z');

async function regularFile(root, relative) {
  if (typeof relative !== 'string' || relative.includes('\\') || path.isAbsolute(relative) || relative.split('/').some(p => !p || p === '.' || p === '..')) {
    throw new Error(`Caminho inválido: ${relative}`);
  }
  let current = root;
  for (const segment of relative.split('/')) {
    current = path.join(current, segment);
    if ((await fs.lstat(current)).isSymbolicLink()) throw new Error(`Symlink recusado: ${relative}`);
  }
  if (!(await fs.stat(current)).isFile()) throw new Error(`Ficheiro ausente: ${relative}`);
  return fs.readFile(current);
}

export async function validatePackage(root) {
  const manifest = JSON.parse(await regularFile(root, 'manifest.json'));
  if (manifest.manifest_version !== 3 || manifest.version !== '0.7.2') throw new Error('Manifest/versão incorretos');
  if (JSON.stringify(manifest.permissions) !== JSON.stringify(['storage', 'sidePanel', 'identity', 'scripting']) || !(manifest.host_permissions === undefined || (Array.isArray(manifest.host_permissions) && manifest.host_permissions.length === 0)) || JSON.stringify(manifest.optional_host_permissions) !== JSON.stringify(['https://eumnfkccyvlyoyjchiwe.supabase.co/*', 'https://web.whatsapp.com/*']) || manifest.optional_permissions || manifest.content_scripts || manifest.externally_connectable) throw new Error('Permissões inesperadas');
  const refs = [manifest.background?.service_worker, manifest.side_panel?.default_path,
    ...Object.values(manifest.icons ?? {}), ...Object.values(manifest.action?.default_icon ?? {}),
    `_locales/${manifest.default_locale}/messages.json`];
  for (const ref of refs) await regularFile(root, ref);
  JSON.parse(await regularFile(root, `_locales/${manifest.default_locale}/messages.json`));
  for (const relative of fixedFiles) await regularFile(root, relative);
  const html = (await regularFile(root, 'sidepanel.html')).toString();
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) await regularFile(root, match[1]);
  return manifest;
}

export async function packageExtension({ sourceDir = source, distDir = path.join(source, 'dist/fastcrm-whatsapp-pro'), zipPath = path.join(source, 'dist/fastcrm-whatsapp-pro-v0.7.2.zip'), distOnly = false } = {}) {
  await validatePackage(sourceDir);
  const files = [...fixedFiles];
  for (const name of (await fs.readdir(path.join(sourceDir, 'icons'))).sort()) {
    if (!/^icon\d+\.png$/.test(name)) throw new Error(`Ícone inesperado: ${name}`);
    files.push(`icons/${name}`);
  }
  for (const locale of (await fs.readdir(path.join(sourceDir, '_locales'))).sort()) {
    if (!/^[a-z]{2}(?:_[A-Z]{2})?$/.test(locale)) throw new Error('Locale inválido');
    files.push(`_locales/${locale}/messages.json`);
  }
  // Ler tudo antes de limpar dist: nunca copiar diretórios inteiros ou ficheiros de desenvolvimento.
  const contents = await Promise.all(files.map(relative => regularFile(sourceDir, relative)));
  await fs.rm(distDir, { recursive: true, force: true });
  for (let i = 0; i < files.length; i++) {
    const target = path.join(distDir, files[i]);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, contents[i], { mode: 0o644 });
    await fs.utimes(target, timestamp, timestamp);
  }
  await validatePackage(distDir);
  if (distOnly) return { distDir, files: files.sort(), zip: null };
  const available = spawnSync('zip', ['-v'], { stdio: 'ignore' });
  if (available.error || available.status !== 0) {
    await fs.rm(zipPath, { force: true });
    return { distDir, files: files.sort(), zip: null, warning: 'Binário zip indisponível; download web pendente.' };
  }
  await fs.mkdir(path.dirname(zipPath), { recursive: true });
  await fs.rm(zipPath, { force: true });
  const result = spawnSync('zip', ['-X', '-q', zipPath, ...files.sort()], { cwd: distDir, env: { ...process.env, TZ: 'UTC' }, encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    await fs.rm(zipPath, { force: true });
    throw new Error('Falha ao gerar ZIP');
  }
  const integrity = spawnSync('unzip', ['-t', zipPath], { encoding: 'utf8' });
  const entries = spawnSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' });
  if (integrity.status !== 0 || entries.status !== 0 || JSON.stringify(entries.stdout.trim().split('\n').sort()) !== JSON.stringify(files.sort())) throw new Error('Integridade/listagem ZIP inválida');
  const bytes = await fs.readFile(zipPath);
  return { distDir, files, zip: zipPath, size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  packageExtension({ distOnly: process.argv.includes('--dist-only') }).then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { console.error(error.message); process.exitCode = 1; });
}