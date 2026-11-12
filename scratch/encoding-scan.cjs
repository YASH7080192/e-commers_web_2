const fs = require('node:fs');
const path = require('node:path');
const needles = ['ðŸ', 'Ã', 'Â', 'â‚', 'â€', 'ï¿½', '�'];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(tsx?|jsx?|html)$/.test(file)) {
      const text = fs.readFileSync(file, 'utf8');
      if (needles.some(needle => text.includes(needle))) console.log(file);
    }
  }
}
walk('src'); walk('server');
const html = fs.readFileSync('index.html', 'utf8');
console.log('index.html UTF-8 meta:', html.includes('charset="UTF-8"'));
