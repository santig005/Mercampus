/**
 * Backup of every file in the ImageKit account the keys point at.
 *
 * Read-only against ImageKit (list + download) and against Mongo (to record
 * which documents reference each file). Writes to `backups/imagekit-<date>/`,
 * which is in `.gitignore` like the database backups:
 *
 *   files/<filePath>   the original bytes, mirroring the account's folders
 *   manifest.json      one entry per file: fileId, filePath, url, size, mime,
 *                      dimensions, dates, tags, sha256, local path, and the
 *                      Mongo documents that reference it
 *   manifest.csv       the same, flattened, for a spreadsheet
 *   _meta.json         totals, unreferenced count, failures
 *
 *   npm run backup:images
 *
 * **Why every download asks for `?tr=orig-true`:** ImageKit converts formats
 * on delivery. Measured 2026-09-13: a 586,433-byte PNG downloaded from its
 * plain URL came back as a 57,094-byte WebP. A backup built from plain URLs
 * would silently not hold the originals. So each download is also checked
 * against the size the API reports, and a mismatch is counted as a failure,
 * never written as if it were the file.
 *
 * `referencedBy` compares origin + path on both sides, because stored URLs
 * sometimes carry `?updatedAt=` (T-116). A file with no references is not
 * necessarily an orphan - it can belong to a legacy folder - so it is listed,
 * not judged.
 *
 * Never prints a key. The URLs in the manifest are the public, unsigned ones.
 */
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import ImageKit from 'imagekit';
import mongoose from 'mongoose';

const CONCURRENCY = 6;
const RETRIES = 2;

const required = ['IMAGEKIT_PUBLIC_KEY', 'IMAGEKIT_PRIVATE_KEY', 'IMAGEKIT_URL_ENDPOINT'];

const normalize = url => {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return null;
  }
};

const csvCell = value => {
  const s = value === undefined || value === null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

async function listAllFiles(ik) {
  const files = [];
  for (let skip = 0; ; skip += 1000) {
    const page = await ik.listFiles({ limit: 1000, skip });
    files.push(...page.filter(f => f.type === 'file'));
    if (page.length < 1000) break;
  }
  return files;
}

// Which products and sellers reference each file, keyed by origin + path.
async function loadReferences() {
  if (!process.env.MONGO_URI) {
    console.log('backup: sin MONGO_URI, el manifiesto no incluirá referencias.');
    return null;
  }
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const refs = new Map();
  const add = (url, ref) => {
    const key = normalize(url);
    if (!key) return;
    if (!refs.has(key)) refs.set(key, []);
    refs.get(key).push(ref);
  };
  for (const p of await db.collection('products').find({}, { projection: { images: 1 } }).toArray()) {
    for (const url of p.images ?? []) add(url, `product:${p._id}`);
  }
  for (const s of await db.collection('sellers').find({}, { projection: { logo: 1 } }).toArray()) {
    if (s.logo) add(s.logo, `seller:${s._id}`);
  }
  return refs;
}

async function download(file, destino) {
  const source = `${file.url.split('?')[0]}?tr=orig-true`;
  let lastError;
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    try {
      const response = await fetch(source);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length !== file.size) {
        throw new Error(`tamaño ${bytes.length} distinto del de la API (${file.size})`);
      }
      const localPath = path.join('files', ...file.filePath.split('/').filter(Boolean));
      await mkdir(path.join(destino, path.dirname(localPath)), { recursive: true });
      await writeFile(path.join(destino, localPath), bytes);
      return {
        localPath: localPath.split(path.sep).join('/'),
        sha256: createHash('sha256').update(bytes).digest('hex'),
      };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function main() {
  const missing = required.filter(name => !process.env[name]);
  if (missing.length) {
    console.error(`backup: faltan variables: ${missing.join(', ')} (ver .env.example y T-11b).`);
    process.exit(1);
  }

  const ik = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  });

  const marca = new Date().toISOString().replace(/[:.]/g, '-');
  const destino = path.join('backups', `imagekit-${marca}`);
  console.log(`backup: origen ${process.env.IMAGEKIT_URL_ENDPOINT}`);
  console.log(`backup: destino ${destino}`);

  try {
    const [files, refs] = await Promise.all([listAllFiles(ik), loadReferences()]);
    const totalBytes = files.reduce((sum, f) => sum + (f.size ?? 0), 0);
    console.log(`backup: ${files.length} archivos, ${(totalBytes / 1048576).toFixed(1)} MB`);
    await mkdir(destino, { recursive: true });

    const manifest = [];
    const failures = [];
    let next = 0;
    let done = 0;

    const worker = async () => {
      while (next < files.length) {
        const file = files[next];
        next += 1;
        try {
          const { localPath, sha256 } = await download(file, destino);
          manifest.push({
            fileId: file.fileId,
            filePath: file.filePath,
            name: file.name,
            url: file.url,
            size: file.size,
            mime: file.mime,
            width: file.width,
            height: file.height,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
            tags: file.tags ?? [],
            sha256,
            localPath,
            referencedBy: refs ? (refs.get(normalize(file.url)) ?? []) : null,
          });
        } catch (error) {
          failures.push({ fileId: file.fileId, filePath: file.filePath, error: error.message });
        }
        done += 1;
        if (done % 50 === 0 || done === files.length) {
          console.log(`  ${String(done).padStart(4)}/${files.length}`);
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    manifest.sort((a, b) => a.filePath.localeCompare(b.filePath));
    await writeFile(path.join(destino, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

    const columns = ['fileId', 'filePath', 'url', 'size', 'mime', 'width', 'height', 'createdAt', 'updatedAt', 'tags', 'sha256', 'localPath', 'referencedBy'];
    const csv = [
      columns.join(','),
      ...manifest.map(entry =>
        columns
          .map(column => {
            const value = entry[column];
            return csvCell(Array.isArray(value) ? value.join(' ') : value);
          })
          .join(',')
      ),
    ].join('\n');
    await writeFile(path.join(destino, 'manifest.csv'), csv, 'utf8');

    const unreferenced = refs ? manifest.filter(entry => entry.referencedBy.length === 0).length : null;
    const meta = {
      origen: process.env.IMAGEKIT_URL_ENDPOINT,
      fecha: new Date().toISOString(),
      archivos: files.length,
      guardados: manifest.length,
      bytes: manifest.reduce((sum, entry) => sum + entry.size, 0),
      sinReferencias: unreferenced,
      fallidos: failures,
    };
    await writeFile(path.join(destino, '_meta.json'), JSON.stringify(meta, null, 2), 'utf8');

    console.log(`\nbackup: guardados ${manifest.length}/${files.length}, fallidos ${failures.length}`);
    if (refs) console.log(`backup: sin ninguna referencia en Mongo: ${unreferenced}`);
    if (failures.length) {
      for (const failure of failures.slice(0, 10)) console.log(`  FALLO ${failure.filePath}: ${failure.error}`);
      process.exitCode = 1;
    } else {
      console.log('backup: listo.');
    }
  } finally {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  }
}

main().catch(error => {
  console.error('backup:', error.message);
  process.exit(1);
});
