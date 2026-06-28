// ============================================================
// /api/contact  —  Função serverless (Vercel)
// Recebe o formulário do site e envia o e-mail via Resend.
//
// SEGURANÇA: a chave fica em process.env.RESEND_API_KEY, configurada
// no painel da Vercel (Settings > Environment Variables) ou via
// `vercel env add`. NUNCA colocar a chave neste arquivo nem no JS do site.
//
// Sem dependências: usa o fetch global do Node 18+ e CommonJS (zero-config).
// ============================================================

const SETORES = { comercial: 'Comercial', compras: 'Compras', rh: 'RH', sac: 'SAC' };

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function safeJson(s) { try { return JSON.parse(s); } catch (_) { return {}; } }

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const body = typeof req.body === 'string' ? safeJson(req.body) : (req.body || {});
  const {
    destinatario, nome, empresa, email, telefone, mensagem, anexo, _gotcha,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
  } = body;

  // Honeypot anti-spam: bot preencheu o campo oculto -> finge sucesso e ignora.
  if (_gotcha) return res.status(200).json({ ok: true });

  if (!nome || !email || !mensagem) {
    return res.status(400).json({ error: 'Preencha nome, e-mail e mensagem.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    return res.status(400).json({ error: 'E-mail inválido.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY ausente — configure na Vercel.');
    return res.status(500).json({ error: 'Servidor não configurado.' });
  }

  // Roteamento por setor: cada departamento recebe na sua própria caixa.
  // (domínio phytonatus.com.br verificado no Resend)
  const RECIPIENTS = {
    comercial: 'comercial@phytonatus.com.br',
    compras: 'compras@phytonatus.com.br',
    rh: 'administrativo@phytonatus.com.br',
    sac: 'sac@phytonatus.com.br',
  };
  const to = RECIPIENTS[destinatario] || process.env.CONTACT_TO || RECIPIENTS.comercial;
  const from = process.env.CONTACT_FROM || 'Phytonatus <nao-responda@phytonatus.com.br>';
  const setorLabel = SETORES[destinatario] || destinatario || 'Comercial';

  const linhas = [
    ['Setor', setorLabel],
    ['Nome', nome],
    ['Empresa', empresa || '—'],
    ['E-mail', email],
    ['Telefone', telefone || '—'],
  ];

  // Origem da campanha (UTMs) — só aparece quando o visitante chegou por um
  // link rastreado (Meta Ads, Instagram, e-mail…). Ajuda o comercial a saber
  // de qual campanha veio o lead.
  const campanha = [
    ['origem', utm_source], ['mídia', utm_medium], ['campanha', utm_campaign],
    ['conteúdo', utm_content], ['termo', utm_term],
  ].filter(([, v]) => v);
  if (campanha.length) {
    linhas.push(['Campanha', campanha.map(([k, v]) => k + ': ' + v).join('  ·  ')]);
  }
  const html =
    '<div style="font-family:Arial,Helvetica,sans-serif;color:#2C1B0A;max-width:560px">' +
      '<h2 style="color:#264E36;margin:0 0 14px">Novo contato pelo site</h2>' +
      '<table style="border-collapse:collapse;width:100%">' +
        linhas.map(([k, v]) =>
          '<tr>' +
            '<td style="padding:7px 10px;background:#F0EFE9;font-weight:bold;width:120px">' + esc(k) + '</td>' +
            '<td style="padding:7px 10px;border-bottom:1px solid #eee">' + esc(v) + '</td>' +
          '</tr>').join('') +
      '</table>' +
      '<p style="margin:16px 0 6px;font-weight:bold;color:#264E36">Mensagem</p>' +
      '<p style="white-space:pre-wrap;line-height:1.5">' + esc(mensagem) + '</p>' +
    '</div>';

  const payload = {
    from,
    to: [to],
    reply_to: String(email),
    subject: 'Site Phytonatus — ' + setorLabel + ' — ' + nome,
    html,
  };

  // Anexo opcional: o navegador manda { filename, contentBase64 } (base64 puro,
  // sem o prefixo "data:..."). Resend aceita base64 em attachments[].content.
  if (anexo && anexo.filename && anexo.contentBase64) {
    payload.attachments = [{ filename: String(anexo.filename), content: String(anexo.contentBase64) }];
  }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const detail = await r.text();
      console.error('Resend falhou', r.status, detail);
      return res.status(502).json({ error: 'Não foi possível enviar agora. Tente novamente.' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Erro de rede ao chamar Resend', err);
    return res.status(502).json({ error: 'Não foi possível enviar agora. Tente novamente.' });
  }
};
