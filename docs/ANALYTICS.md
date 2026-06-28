# Analytics — Tagueamento de ações & UTMs (Phytonatus)

Guia da camada de medição do site. Cobre **(1)** os eventos de ação que o
site dispara no GA4 e **(2)** a convenção de UTM para campanhas.

- **Measurement ID:** `G-FET4J9PY1M`
- **Propriedade GA4:** Phytonatus (`properties/543515693`)
- **Fluxo de dados:** OFICIAL (`15163537402`) — `https://www.phytonatus.com.br`
- **Arquivos:** `assets/js/analytics.js` (camada de eventos) · `assets/js/main.js`
  (lead do formulário) · `api/contact.js` (campanha no e-mail).

> A tag base `gtag.js` está no `<head>` de todas as páginas. O
> `analytics.js` **não** recria a tag — só dispara eventos de ação por cima
> dela, num único ponto, para a equipe "clusterizar por ação" nos relatórios.

---

## 1. O que já vem de graça (Enhanced Measurement)

O GA4 já coleta automaticamente, sem código, no fluxo Web:
`page_view`, `scroll`, **cliques de saída** (Amazon, Mercado Livre, WhatsApp,
YouTube…), **downloads de arquivo** (`file_download` p/ PDFs) e engajamento de
vídeo do YouTube. Isso é o "baseline".

Os eventos abaixo são a **camada semântica** que adicionamos por cima: nomes
claros e parâmetros que deixam o relatório limpo (ex.: separar Amazon de
Mercado Livre, saber a posição do botão na página). Não colidem com os
automáticos porque têm nomes próprios.

---

## 2. Dicionário de eventos

Todo evento leva sempre `page_name` (ex.: `home`, `marcas`, `contato`).

| Evento | Quando dispara | Parâmetros |
|---|---|---|
| `download_catalogo` | clique em qualquer link do `catalogo.pdf` | `posicao`, `label` |
| `download_material` | clique em outro PDF (ex.: `tabela-nutricional.pdf`) | `arquivo`, `posicao`, `label` |
| `click_loja` | clique em loja/marketplace (Amazon, Mercado Livre, Loja Phytonatus) | `loja`, `posicao`, `label` |
| `click_whatsapp` | clique em link `wa.me` / WhatsApp | `posicao`, `label` |
| `click_marca` | clique num card de marca (Empório do Mel, Nut's, Phytonatus, Vida Gourmet) | `marca`, `posicao` |
| `click_social` | clique em YouTube / Instagram / Facebook | `rede`, `posicao` |
| `click_email` / `click_telefone` | clique em `mailto:` / `tel:` | `posicao`, `label` |
| `play_video` | play no vídeo institucional (YouTube) | `video_id`, `titulo` |
| `generate_lead` | **envio do formulário com sucesso** (evento-chave) | `setor`, `form_id`, `utm_source`, `utm_campaign` |
| `cta_click` | qualquer botão marcado com `data-evt="cta_click"` | `cta`, `posicao`, `label` |
| `click_botao` | fallback: qualquer outro botão/link (garante cobertura total) | `label`, `destino`, `posicao` |

**Valores de `posicao`:** `nav`, `menu_mobile`, `hero`, `corpo`, `footer`.
**Valores de `loja`:** `amazon`, `mercado_livre`, `loja_phytonatus`, `shopee`, `outra`.

### Marcar um botão novo manualmente

Para nomear explicitamente uma ação (recomendado para CTAs importantes), use
`data-evt` no elemento. Qualquer atributo `data-evt-xyz` vira o parâmetro `xyz`:

```html
<a href="contato.html" class="btn"
   data-evt="cta_click" data-evt-cta="falar-comercial">
   Falar com o Comercial →
</a>
```

Isso dispara `cta_click` com `{ cta: "falar-comercial", posicao: "...", label: "..." }`.

### Depurar no navegador

No console do site: `window.__PHYTO_DEBUG = true` e clique nos botões — cada
evento aparece logado como `[phyto-track] nome {params}`. No GA4 use o
**DebugView** (Admin → DebugView) com a extensão *GA Debugger* ligada.

---

## 3. Convenção de UTM (campanhas)

UTMs são parâmetros no fim do link que dizem ao GA4 **de onde** veio o
visitante. Sem padronização, o relatório vira bagunça (`facebook`, `Facebook`,
`fb`, `FB` viram 4 origens diferentes). **Sempre minúsculas, sem acento, sem
espaço (use `-`).**

| Parâmetro | O que é | Valores padrão |
|---|---|---|
| `utm_source` | de onde veio | `instagram`, `facebook`, `meta-ads`, `google`, `email`, `whatsapp`, `linktree` |
| `utm_medium` | o tipo de mídia | `social`, `cpc` (anúncio pago), `bio`, `email`, `organico` |
| `utm_campaign` | nome da campanha | `catalogo-2026`, `black-friday`, `lancamento-nuts`, `institucional` |
| `utm_content` | qual criativo/variação (opcional) | `story-1`, `feed-carrossel`, `botao-rodape` |
| `utm_term` | palavra-chave (só busca paga, opcional) | `mel-puro` |

### Modelos prontos (copie e troque a campanha)

```
# Bio do Instagram
https://www.phytonatus.com.br/?utm_source=instagram&utm_medium=bio&utm_campaign=perfil

# Story orgânico do Instagram
https://www.phytonatus.com.br/?utm_source=instagram&utm_medium=social&utm_campaign=catalogo-2026&utm_content=story

# Anúncio pago (Meta Ads) — leva para a página de marca própria
https://www.phytonatus.com.br/private-label.html?utm_source=meta-ads&utm_medium=cpc&utm_campaign=private-label&utm_content=feed-carrossel

# E-mail marketing
https://www.phytonatus.com.br/?utm_source=email&utm_medium=email&utm_campaign=newsletter-junho
```

> Dica: monte os links no **Campaign URL Builder** do Google
> (`https://ga-dev-tools.google/campaign-url-builder/`) usando os valores da
> tabela acima.

### UTMs ligam a campanha ao lead

Quando o visitante chega por um link com UTM, o `analytics.js` guarda a
campanha durante a sessão. No envio do formulário, ela vai junto:
- para o **GA4** (parâmetros do evento `generate_lead`); e
- para o **e-mail** que o comercial recebe (linha "Campanha").

Ou seja: o time vê de qual anúncio/campanha veio cada lead.

---

## 4. Como ver no GA4

- **Tempo real** (`Relatórios → Tempo real`): usuários e eventos ao vivo
  (atraso de segundos). Bom para validar na hora.
- **DebugView** (`Admin → DebugView`): evento por evento, com parâmetros — o
  modo de conferência durante o setup.
- **Relatórios de Eventos** (`Relatórios → Engajamento → Eventos`): números
  agregados; consolidam em algumas horas (até ~24h para um evento novo
  aparecer nomeado pela 1ª vez).
- **Explorações / Looker Studio**: painéis sob medida para a equipe.

---

## 5. Configuração no GA4 (dimensões e eventos-chave)

Os parâmetros (`loja`, `posicao`, `setor`, `rede`, `marca`, `utm_*`) só
aparecem como **coluna filtrável** nos relatórios depois de registrados como
**Dimensões personalizadas** (Admin → Definições personalizadas). E as ações de
maior valor viram **Eventos-chave** (conversões) em Admin → Eventos-chave.

Já registrados via Admin API (conta de serviço):

**Dimensões personalizadas** (escopo de evento): `page_name`, `posicao`,
`loja`, `setor`, `marca`, `rede`, `cta`, `utm_source`, `utm_medium`,
`utm_campaign`.

**Eventos-chave (conversões):** `generate_lead`, `download_catalogo`,
`click_whatsapp`.

> Se precisar refazer, o script está em `scripts/ga4_setup.py` (usa
> `~/.secrets/ga4-phytonatus.json`).
