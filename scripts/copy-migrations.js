import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, '../server/db/migrations');
const destDir = path.join(__dirname, '../dist-server/migrations');

try {
  if (fs.existsSync(srcDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    copyDir(srcDir, destDir);
    console.log('Migrations copied successfully to dist-server/migrations');
  } else {
    console.warn('Source migrations directory does not exist:', srcDir);
  }
} catch (err) {
  console.error('Error copying migrations:', err);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
