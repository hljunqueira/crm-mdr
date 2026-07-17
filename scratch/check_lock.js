import fs from 'fs';
import path from 'path';

const appData = process.env.APPDATA || '';
const dirPath = path.join(appData, 'react-example');
console.log('App Data Directory:', dirPath);

if (fs.existsSync(dirPath)) {
  const lockFile = path.join(dirPath, 'lockfile');
  if (fs.existsSync(lockFile)) {
    console.log('lockfile exists!');
    try {
      fs.unlinkSync(lockFile);
      console.log('Deleted lockfile successfully!');
    } catch (e) {
      console.error('Failed to delete lockfile:', e.message);
    }
  } else {
    console.log('lockfile does not exist.');
  }
} else {
  console.log('Directory does not exist.');
}
