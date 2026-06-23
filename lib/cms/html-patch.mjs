import { parse } from 'parse5';

const TEXT_ATTR = 'data-cms';
const IMG_ATTR = 'data-cms-img';
const BG_ATTR = 'data-cms-bg';
const LABEL_ATTR = 'data-cms-label';

const BG_URL_RE = /(background-image\s*:\s*url\(\s*['"]?)([^'")]+)(['"]?\s*\))/i;
function bgUrl(style) {
  const m = (style || '').match(BG_URL_RE);
  return m ? m[2] : '';
}

export class CmsError extends Error {}

function attr(node, name) {
  if (!node.attrs) return undefined;
  const a = node.attrs.find((x) => x.name === name);
  return a ? a.value : undefined;
}

function walk(node, visit) {
  if (node.attrs) visit(node);
  for (const k of node.childNodes || []) walk(k, visit);
}

function innerText(node) {
  let out = '';
  for (const k of node.childNodes || []) if (k.nodeName === '#text') out += k.value;
  return out;
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

export function scanFields(html) {
  const doc = parse(html, { sourceCodeLocationInfo: true });
  const fields = [];
  walk(doc, (node) => {
    const textId = attr(node, TEXT_ATTR);
    const imgId = attr(node, IMG_ATTR);
    const bgId = attr(node, BG_ATTR);
    if (textId) {
      fields.push({ id: textId, type: 'text', label: attr(node, LABEL_ATTR) || textId, value: innerText(node).trim() });
    } else if (imgId) {
      fields.push({ id: imgId, type: 'image', label: attr(node, LABEL_ATTR) || imgId, value: attr(node, 'src') || '' });
    } else if (bgId) {
      fields.push({ id: bgId, type: 'background', label: attr(node, LABEL_ATTR) || bgId, value: bgUrl(attr(node, 'style')) });
    }
  });
  return fields;
}

function findOne(html, attrName, id) {
  const doc = parse(html, { sourceCodeLocationInfo: true });
  const matches = [];
  walk(doc, (node) => { if (attr(node, attrName) === id) matches.push(node); });
  if (matches.length === 0) throw new CmsError(`campo '${id}' não encontrado`);
  if (matches.length > 1) throw new CmsError(`campo '${id}' aparece ${matches.length}x — id deve ser único`);
  return matches[0];
}

export function patchText(html, id, value) {
  const node = findOne(html, TEXT_ATTR, id);
  for (const k of node.childNodes || []) {
    if (k.nodeName !== '#text') throw new CmsError(`campo '${id}' tem markup interno; só texto puro é editável`);
  }
  const loc = node.sourceCodeLocation;
  if (!loc || !loc.startTag || !loc.endTag) throw new CmsError(`campo '${id}' não suporta edição de texto`);
  return html.slice(0, loc.startTag.endOffset) + escapeHtml(value) + html.slice(loc.endTag.startOffset);
}

export function patchImageSrc(html, id, src) {
  const node = findOne(html, IMG_ATTR, id);
  const srcLoc = node.sourceCodeLocation && node.sourceCodeLocation.attrs && node.sourceCodeLocation.attrs.src;
  if (!srcLoc) throw new CmsError(`imagem '${id}' não tem atributo src`);
  return html.slice(0, srcLoc.startOffset) + `src="${src}"` + html.slice(srcLoc.endOffset);
}

export function patchBackgroundImage(html, id, url) {
  const node = findOne(html, BG_ATTR, id);
  const styleLoc = node.sourceCodeLocation && node.sourceCodeLocation.attrs && node.sourceCodeLocation.attrs.style;
  if (!styleLoc) throw new CmsError(`fundo '${id}' não tem atributo style`);
  const styleStr = html.slice(styleLoc.startOffset, styleLoc.endOffset);
  if (!BG_URL_RE.test(styleStr)) throw new CmsError(`fundo '${id}' não tem background-image no style`);
  const replaced = styleStr.replace(BG_URL_RE, `$1${url}$3`);
  return html.slice(0, styleLoc.startOffset) + replaced + html.slice(styleLoc.endOffset);
}
