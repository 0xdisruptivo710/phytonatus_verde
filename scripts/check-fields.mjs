// Valida as anotações data-cms/data-cms-img das páginas.
// Uso: node scripts/check-fields.mjs            (todas as páginas)
//      node scripts/check-fields.mjs marcas.html (só uma)
import fs from 'node:fs';
import { scanFields, patchText, patchImageSrc, patchBackgroundImage } from '../lib/cms/html-patch.mjs';

const ALL = ['index.html', 'institucional.html', 'marcas.html', 'onde-encontrar.html', 'private-label.html', 'contato.html'];
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ALL;

let problems = 0;
for (const p of pages) {
  if (!fs.existsSync(p)) { console.log(`- ${p}: (não existe, pulado)`); continue; }
  const html = fs.readFileSync(p, 'utf8');
  const fields = scanFields(html);
  const ids = fields.map((f) => f.id);
  const dup = [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))];
  if (dup.length) { console.error(`  ✖ ${p}: ids duplicados: ${dup.join(', ')}`); problems += dup.length; }
  for (const f of fields) {
    try {
      if (f.type === 'text') patchText(html, f.id, f.value);
      else if (f.type === 'background') patchBackgroundImage(html, f.id, f.value);
      else patchImageSrc(html, f.id, f.value);
    } catch (e) {
      console.error(`  ✖ ${p} :: ${f.id} (${f.type}) -> ${e.message}`);
      problems++;
    }
  }
  console.log(`  ${p}: ${fields.length} campos${fields.length ? ' [' + fields.map((f) => f.id).join(', ') + ']' : ''}`);
}

if (problems) { console.error(`\n${problems} problema(s) encontrado(s).`); process.exit(1); }
console.log('\nAnotação OK.');
