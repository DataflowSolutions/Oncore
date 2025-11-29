import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

// Test pdf-parse import
console.log('Testing PDF extraction with pdf-parse v2...\n');

try {
  console.log('1. Checking PDFParse class...');
  console.log('   Type:', typeof PDFParse);
  console.log('   Is constructor?', typeof PDFParse === 'function');
  
  const pdfBuffer = readFileSync(resolve('lib/import/test/docs/advancing-email-thread.pdf'));
  console.log('   Buffer size:', pdfBuffer.length, 'bytes\n');
  
  console.log('2. Testing extraction with PDFParse class...');
  const parser = new PDFParse({ data: pdfBuffer });
  const result = await parser.getText();
  await parser.destroy();
  
  console.log('   ✅ Extraction works!');
  console.log('   Pages:', result.total);
  console.log('   Text length:', result.text.length);
  console.log('   Word count:', result.text.split(/\s+/).filter(Boolean).length);
  console.log('\n   Text preview:');
  console.log('   ', result.text.substring(0, 500).replace(/\n/g, '\n    '));
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}
