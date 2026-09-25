import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { FileStore } from './store/fileStore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataFile = process.env.DATA_FILE || path.join(__dirname, '..', 'data', 'store.json');
const port = Number(process.env.PORT || 3000);

const store = new FileStore(dataFile);
store.load();

createApp(store).listen(port, () => {
  console.log(`[mock-platform] server listening on http://0.0.0.0:${port}`);
  console.log(`[mock-platform] data file: ${dataFile}`);
});
