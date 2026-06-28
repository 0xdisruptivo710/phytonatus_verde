# PRD — Analytics & Tagueamento de Ações (GA4) — Phytonatus

**Status:** Fase 1 e 2 concluídas e em produção · **Última atualização:** 2026-06-28
**Site:** https://www.phytonatus.com.br · **Repositório:** `phytonatusv2` (deploy via Vercel)

Documento de referência (handoff) de tudo que foi feito na medição do site. Quem
abrir isto amanhã consegue entender o estado, validar e continuar sem contexto
prévio.

---

## 1. Objetivo

Duas tarefas pedidas:

1. **Tagueamento de todos os botões/ações + clusterização por ação** — saber, no
   GA4, quantas pessoas baixam o catálogo, clicam em cada loja, no WhatsApp,
   enviam o formulário, dão play no vídeo etc., com parâmetros que permitam
   fatiar por página e por posição.
2. **UTMs — padronizar e linkar para ter rastreamento** — convenção única de
   campanha (Meta Ads, Instagram, e-mail) e ligação da campanha ao lead.

Pré-requisito que também foi resolvido: o site **não tinha nenhuma tag do
Google**. A tag base `gtag.js` (`G-FET4J9PY1M`) foi instalada em todas as
páginas antes deste trabalho.

---

## 2. Resumo executivo (TL;DR)

- ✅ Tag GA4 base no ar nas 7 páginas.
- ✅ Camada de eventos semânticos (`assets/js/analytics.js`) disparando ~10 tipos
  de evento por ação, com parâmetros (`loja`, `posicao`, `setor`, `marca`…).
- ✅ `generate_lead` no envio do formulário, com a campanha (UTMs) anexada ao
  evento **e** ao e-mail que o comercial recebe.
- ✅ Captura e atribuição de UTMs/`gclid`/`fbclid` por sessão.
- ✅ 10 dimensões personalizadas + 3 eventos-chave (conversões) registrados no
  GA4 via Admin API.
- ✅ Validado ponta a ponta ao vivo: eventos disparam, beacons saem, GA4 responde
  **204 (aceito)** com os parâmetros corretos.
- ⏳ Pendências: 2 links de loja vazios em `onde-encontrar.html`; painel Looker
  Studio; nomear CTAs internos com `data-evt`.

---

## 3. Arquitetura (fluxo de dados)

```
Visitante clica  ──►  analytics.js (1 listener delegado)  ──►  gtag('event', ...)
                                                                     │
   captura UTM da URL ──► sessionStorage ──┐                         ▼
                                           │                google-analytics.com/g/collect
   form enviado (main.js) ──► generate_lead┘                         │
                          └─► UTMs no payload ──► /api/contact ──► e-mail (Resend)
                                                                     ▼
                                                          GA4 (propriedade 543515693)
                                              Tempo real · DebugView · Relatórios · Looker
                                                                     ▲
                                       analytics-mcp (conta de serviço) lê os relatórios
```

A tag base é a mesma do GA4 (carregada no `<head>`). O `analytics.js` **não**
recria a tag — só dispara eventos por cima dela, num único ponto, para a equipe
"clusterizar por ação".

---

## 4. O que foi implementado (detalhado)

### 4.1 Camada de eventos — `assets/js/analytics.js`
Um único `click` listener delegado (fase de captura) que classifica o alvo e
dispara o evento certo. Todo evento leva `page_name`.

| Evento | Gatilho | Parâmetros (cluster) |
|---|---|---|
| `download_catalogo` | links do `catalogo.pdf` | `posicao`, `label` |
| `download_material` | outros PDFs (ex.: tabela nutricional) | `arquivo`, `posicao` |
| `click_loja` | Amazon / Mercado Livre / Loja Phytonatus | `loja`, `posicao` |
| `click_whatsapp` | links `wa.me` | `posicao` |
| `click_marca` | cards das 4 marcas | `marca` |
| `click_social` | YouTube / Instagram / Facebook | `rede` |
| `click_email` / `click_telefone` | `mailto:` / `tel:` | `posicao` |
| `play_video` | play no vídeo institucional | `video_id` |
| `generate_lead` ⭐ | envio do form com sucesso | `setor`, `form_id`, `utm_*` |
| `cta_click` | elementos com `data-evt="cta_click"` | `cta` |
| `click_botao` | fallback p/ qualquer outro botão | `label`, `destino`, `posicao` |

`posicao` ∈ {`nav`, `menu_mobile`, `hero`, `corpo`, `footer`}.
`loja` ∈ {`amazon`, `mercado_livre`, `loja_phytonatus`, `shopee`, `outra`}.
Debug no navegador: `window.__PHYTO_DEBUG = true`.

### 4.2 Lead + atribuição — `assets/js/main.js`
No sucesso do envio do formulário (`setupFormSubmit`), dispara `generate_lead` e
anexa os UTMs capturados ao `payload` enviado para `/api/contact`.

### 4.3 Vídeo — `institucional.html`
A função `load()` da facade do YouTube dispara `play_video` antes de injetar o
iframe.

### 4.4 Campanha no e-mail — `api/contact.js`
Lê `utm_source/medium/campaign/content/term` do corpo e, se houver, adiciona uma
linha **"Campanha"** no e-mail do lead. Mudança aditiva — o fluxo Resend não foi
alterado.

### 4.5 UTMs (captura)
`analytics.js` lê `utm_*`, `gclid`, `fbclid` da URL de entrada e guarda em
`sessionStorage` (`phyto_attribution`) durante a sessão.

---

## 5. Arquivos criados / alterados

**Criados**
- `assets/js/analytics.js` — camada de eventos + captura de UTM.
- `docs/ANALYTICS.md` — dicionário de eventos + convenção de UTM (uso diário).
- `docs/PRD-ANALYTICS-GA4.md` — este documento.
- `scripts/ga4_setup.py` — registra dimensões + eventos-chave via Admin API (idempotente).
- `.env.example` — ganhou a seção GA4 (modelo, sem segredos).

**Alterados**
- `assets/js/main.js` — `generate_lead` + UTMs no payload.
- `institucional.html` — `play_video`.
- `api/contact.js` — linha "Campanha" no e-mail.
- 7 páginas (`index`, `institucional`, `marcas`, `onde-encontrar`,
  `private-label`, `contato`, `politica-privacidade`) — carregam
  `analytics.js?v=1`; `main.js` subiu de `?v=11` para `?v=12`.

Commit principal: `feat(analytics): tagueamento de acoes (eventos GA4) + captura de UTM`.

---

## 6. Configuração no GA4

| Item | Valor |
|---|---|
| Conta | Phytonatus |
| Propriedade | `properties/543515693` |
| Measurement ID | `G-FET4J9PY1M` |
| Fluxo de dados | OFICIAL (`15163537402`) |

**Dimensões personalizadas (escopo de evento):** `page_name`, `posicao`, `loja`,
`setor`, `marca`, `rede`, `cta`, `utm_source`, `utm_medium`, `utm_campaign`.

**Eventos-chave (conversões):** `generate_lead`, `download_catalogo`,
`click_whatsapp`.

> Recriar/ajustar: `uv run --no-project --with google-analytics-admin python scripts/ga4_setup.py`
> (o binário `uv` está em `C:\Users\Usuario\AppData\Roaming\Python\Python314\Scripts\uv.exe`).

### Credenciais / IDs (NÃO ficam no repo)
Todos os IDs, e-mail da conta de serviço e caminho da chave estão em:
**`~/.secrets/phytonatus-ga4.env`** (fora do repositório).
A chave PRIVADA da conta de serviço está só em **`~/.secrets/ga4-phytonatus.json`**.
A `RESEND_API_KEY` real vive na **Vercel** (Settings → Environment Variables).

---

## 7. Verificação realizada (2026-06-28)

Teste ao vivo em produção com navegador headless:
- **Eventos disparam:** logs `[phyto-track]` no console para `download_catalogo`,
  `click_loja` (amazon/mercado_livre/loja_phytonatus), `click_whatsapp`,
  `click_marca`.
- **GA4 aceitou:** cada evento virou um `POST .../g/collect` com resposta
  **204** e os parâmetros corretos (`ep.posicao=nav`, `ep.loja=amazon`…).
- **Enhanced Measurement** confirmado disparando `file_download` e `click`
  (outbound) automáticos em paralelo — baseline que coexiste com a camada custom.

**Observação importante:** o **Tempo real** não exibiu o teste porque o GA4
**filtra tráfego de bot** automaticamente e o navegador de teste se identifica
como `HeadlessChrome`. Isso afeta só o teste automatizado; **usuário real
(celular/PC) aparece normalmente.**

---

## 8. Como validar (você mesmo, navegador real)

1. **GA4 → Relatórios → Tempo real.**
2. Abra `www.phytonatus.com.br` no celular/PC e clique em Catálogo, numa loja, no
   WhatsApp.
3. Card **"Contagem de eventos por Nome do evento"** mostra os eventos; clique
   num evento para ver os parâmetros.
4. Detalhe com parâmetros: extensão **Google Analytics Debugger** + **Admin →
   DebugView**.

Timing: Tempo real/DebugView = na hora. Relatório de **Eventos** padrão = até
~24h para um evento novo aparecer nomeado. Conversões contam a partir de agora.

---

## 9. Pendências

- ⏳ **Links de loja vazios:** em `onde-encontrar.html`, os cards **Amazon** e
  **Mercado Livre** estão com `href="#"`. Disparam `click_loja` mas não levam a
  lugar nenhum. Falta as 2 URLs reais. (Na home esses links já estão corretos.)
- ⏳ **Painel Looker Studio** conectado ao GA4 (dashboard único para a equipe).
- ⏳ **Nomear CTAs internos** com `data-evt="cta_click"` (ex.: "Falar com o
  Comercial", "Quero revender") para clusterizar por botão.

---

## 10. Próximos passos (amanhã)

1. Receber as 2 URLs (Amazon/Mercado Livre) e corrigir `onde-encontrar.html`.
2. Montar o painel no Looker Studio (eventos + origem de campanha + leads).
3. Marcar os CTAs internos prioritários com `data-evt`.
4. (Opcional) Primeira leitura de dados reais via `analytics-mcp` depois de 24-48h
   de tráfego.

---

## 11. Referências

- Dicionário de eventos + convenção de UTM: `docs/ANALYTICS.md`
- Script de configuração GA4: `scripts/ga4_setup.py`
- IDs/credenciais (fora do repo): `~/.secrets/phytonatus-ga4.env`
- Camada de eventos: `assets/js/analytics.js`
