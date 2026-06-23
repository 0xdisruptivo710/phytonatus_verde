const $ = (s, r = document) => r.querySelector(s);
const api = (path, opts = {}) => fetch('/api/admin/' + path, { headers: { 'Content-Type': 'application/json' }, ...opts }).then(async (r) => {
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || ('erro ' + r.status));
  return data;
});

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  setTimeout(() => { t.hidden = true; }, 2500);
}

// ---- login ----
$('#enter').onclick = async () => {
  $('#login-error').textContent = '';
  try {
    await api('login', { method: 'POST', body: JSON.stringify({ password: $('#password').value }) });
    showApp();
  } catch (e) { $('#login-error').textContent = e.message; }
};
$('#password').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#enter').click(); });

$('#logout').onclick = () => { document.cookie = 'phyto_cms=; Max-Age=0; path=/'; location.reload(); };

document.querySelectorAll('.tabs button').forEach((b) => b.onclick = () => {
  document.querySelectorAll('.tabs button').forEach((x) => x.classList.remove('active'));
  b.classList.add('active');
  $('#tab-editor').hidden = b.dataset.tab !== 'editor';
  $('#tab-history').hidden = b.dataset.tab !== 'history';
  if (b.dataset.tab === 'history') loadHistory();
});

async function showApp() {
  $('#login').hidden = true; $('#app').hidden = false; $('#logout').hidden = false;
  await loadFields();
}

// ---- editor ----
async function loadFields() {
  try {
    const { pages } = await api('fields');
    $('#editor-status').textContent = '';
    const root = $('#pages'); root.innerHTML = '';
    for (const p of pages) {
      const box = document.createElement('div'); box.className = 'page';
      box.innerHTML = `<h2>${p.page.replace('.html', '')}</h2>`;
      if (!p.fields.length) { const e = document.createElement('p'); e.className = 'muted'; e.textContent = 'Sem campos marcados.'; box.appendChild(e); }
      for (const f of p.fields) box.appendChild(renderField(p.page, f));
      root.appendChild(box);
    }
  } catch (e) {
    if (/autenticado/.test(e.message)) return location.reload();
    $('#editor-status').textContent = e.message;
  }
}

function renderField(page, f) {
  const wrap = document.createElement('div'); wrap.className = 'field';
  const label = document.createElement('label'); label.textContent = f.label; wrap.appendChild(label);
  if (f.type === 'text') {
    const ta = document.createElement('textarea'); ta.value = f.value;
    const btn = document.createElement('button'); btn.className = 'small'; btn.textContent = 'Salvar';
    btn.onclick = async () => {
      btn.disabled = true;
      try { await api('save-text', { method: 'POST', body: JSON.stringify({ page, id: f.id, value: ta.value }) }); toast('Salvo! Vai ao ar em ~1 min.'); }
      catch (e) { toast('Erro: ' + e.message); } finally { btn.disabled = false; }
    };
    wrap.appendChild(ta); wrap.appendChild(btn);
  } else {
    const row = document.createElement('div'); row.className = 'row';
    const img = document.createElement('img'); img.className = 'thumb'; img.src = '/' + f.value;
    const file = document.createElement('input'); file.type = 'file'; file.accept = 'image/png,image/jpeg,image/webp';
    const btn = document.createElement('button'); btn.className = 'small'; btn.textContent = 'Enviar';
    btn.onclick = async () => {
      if (!file.files[0]) return toast('Escolha uma imagem.');
      btn.disabled = true;
      try {
        const { base64, mimeType } = await downscale(file.files[0], 1600);
        const out = await api('save-image', { method: 'POST', body: JSON.stringify({ page, id: f.id, fileBase64: base64, mimeType }) });
        img.src = '/' + out.src; toast('Imagem trocada! Vai ao ar em ~1 min.');
      } catch (e) { toast('Erro: ' + e.message); } finally { btn.disabled = false; }
    };
    row.appendChild(img); row.appendChild(file); row.appendChild(btn);
    wrap.appendChild(row);
  }
  return wrap;
}

// Reduz a imagem no navegador para caber no limite de upload e acelerar.
function downscale(fileObj, maxW) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(fileObj);
    const im = new Image();
    im.onload = () => {
      const scale = Math.min(1, maxW / im.width);
      const c = document.createElement('canvas');
      c.width = Math.round(im.width * scale); c.height = Math.round(im.height * scale);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const dataUrl = c.toDataURL('image/jpeg', 0.9);
      resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
    };
    im.onerror = () => reject(new Error('imagem inválida'));
    im.src = url;
  });
}

// ---- history ----
async function loadHistory() {
  const ul = $('#commits'); ul.innerHTML = '<li class="muted">Carregando…</li>';
  try {
    const { commits } = await api('revert');
    ul.innerHTML = '';
    if (!commits.length) { ul.innerHTML = '<li class="muted">Sem alterações ainda.</li>'; return; }
    for (const c of commits) {
      const li = document.createElement('li');
      const span = document.createElement('span'); span.className = 'msg';
      span.textContent = c.message.replace(/^content:\s*/, '') + ' — ' + new Date(c.date).toLocaleString('pt-BR');
      const btn = document.createElement('button'); btn.className = 'small'; btn.textContent = 'Desfazer';
      btn.onclick = async () => {
        if (!confirm('Desfazer esta alteração?')) return;
        btn.disabled = true;
        try { await api('revert', { method: 'POST', body: JSON.stringify({ sha: c.sha }) }); toast('Desfeito! Vai ao ar em ~1 min.'); loadHistory(); }
        catch (e) { toast('Erro: ' + e.message); btn.disabled = false; }
      };
      li.appendChild(span); li.appendChild(btn); ul.appendChild(li);
    }
  } catch (e) { ul.innerHTML = '<li class="error">' + e.message + '</li>'; }
}

// Se já houver sessão (cookie), tenta abrir direto.
api('fields').then(showApp).catch(() => {});
