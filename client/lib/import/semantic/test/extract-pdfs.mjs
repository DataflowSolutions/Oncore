import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pdfDir = path.join(__dirname, 'pdfs');

async function extractAll() {
  const files = fs.readdirSync(pdfDir).filter(f => f.endsWith('.pdf'));
  
  for (const file of files) {
    const filePath = path.join(pdfDir, file);
    const buffer = fs.readFileSync(filePath);
    const data = await pdf(buffer);
    
    console.log('='.repeat(80));
    console.log('📄 FILE:', file);
    console.log('='.repeat(80));
    console.log(data.text);
    console.log('\n');
  }
}

extractAll();
