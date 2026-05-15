# Design System: Phytonatus (Site Institucional B2B)

> Documento gerado a partir do site implementado em `index.html`, `institucional.html`, `marcas.html`, `private-label.html`, `onde-encontrar.html`, `contato.html` e `assets/css/style.css`. Reflete a paleta Pantone oficial confirmada no briefing 24/04 e as decisões tomadas em ata 17/04 com a Ana.

---

## 1. Visual Theme & Atmosphere

Uma interface institucional B2B com respiração editorial, ancorada em tons naturais (bege, verde escuro, marrom) e tipografia humanista de baixa saturação visual. O sítio comunica **rótulo limpo**, *clean label*, e **saudabilidade premium sem ser luxo** — o público é gerente de compras de supermercado, comprador de *private label* e apicultor parceiro, não consumidor final.

- **Densidade:** *Daily App Balanced* — seções respiram com `clamp()` em padding vertical; nunca cockpit, nunca galeria mínima.
- **Variância:** *Offset Asymmetric* — heros alinhados à esquerda com vídeo de fundo, divisores de onda, faixas full-bleed alternando bege e verde escuro.
- **Motion:** *Fluid CSS* — `reveal` em headlines (clip + translateY), `fade-in` em CTAs ao scroll, parallax leve em imagens de marca, cursor abelha animado (desktop apenas).
- **Sensação:** "campo aberto bem-fotografado pela manhã" — não floresta fechada, não laboratório clínico.

---

## 2. Color Palette & Roles

Paleta Pantone oficial confirmada com a cliente. **Regra inviolável: marrom só aparece em letras**, nunca como fundo de superfície ou bloco.

### Neutros / fundos
- **Bege Principal 7527 C** (`#DDD7C7`) — fundo dominante do corpo, seções principais, header em modo claro.
- **Bege Contraste 468 C** (`#DCC9A0`) — faixas de respiro entre seções, "PHYTONATUS · DESDE 1999", variantes warm.
- **Bege Suave 7499 C** (`#F0E6C5`) — apoio Vida Gourmet, fundos de card mais altos.
- **Verde Escuro Pantone 350 C** (`#264E36`) — fundos escuros (footer, header scrolled, page-overlay), também é o **accent principal** institucional.

### Texto (marrom só aqui)
- **Marrom Chocolate 4625 C** (`#2C1B0A`) — texto principal, headlines em fundos claros. **NUNCA usar como background.**
- **Marrom Café 462 C** (`#5B4B3A`) — texto secundário em fundos bege.
- **Verde Escuro 350 C @ 62%** (`rgba(38,78,54,0.62)`) — substitui cinza claro tradicional; usado em meta/captions em fundos claros.
- **Verde Claro 7485 C @ 95%** (`rgba(210,227,180,0.95)`) — texto em fundos escuros (substitui qualquer cinza-em-dark).

### Accent institucional
- **Verde Escuro 350 C** (`#264E36`) — CTA primário, links ativos, sublinhados de hover, bullet dividers.
- **Verde Claro Pantone 7485 C** (`#D2E3B4`) — accent suave, hover sobre verde escuro, detalhes botânicos.

### Acentos por submarca (usar APENAS dentro da seção/página da marca)
| Marca | Cor | Hex | Pantone |
|---|---|---|---|
| Phytonatus Apicultor (produto) | Marrom | `#2C1B0A` | 4625 C |
| Phytonatus Apicultor — amarelo | Amarelo gema | `#F1B500` | 7406 C |
| Phytonatus Apicultor — bordô | Bordô | `#3F1B1B` | 4975 C |
| Phytonatus Marca Mãe — verde claro | Verde sálvia | `#A1B07A` | 5835 C |
| Phytonatus Marca Mãe — verde escuro | Verde folha | `#009A44` | 347 C |
| Empório do Mel — amarelo 1 | Amarelo pólen | `#F4ED7C` | 602 C |
| Empório do Mel — amarelo 2 | Amarelo mel | `#F8DD7B` | 120 C |
| Empório Nuts — vermelho | Vermelho terracota | `#DC241F` | 485 C |
| Empório Nuts — bege secundário | Bege oliva | `#D9CDA5` | 7502 C |
| Vida Gourmet — vermelho | Vermelho cereja | `#C8102E` | 186 C |

### Bordas / separadores
- Modo claro: `rgba(26,18,8,0.12)` — 1px estrutural sobre bege.
- Modo escuro: `rgba(255,255,255,0.09)` — 1px sobre verde 350 C.

### Banido
- `#000000` puro e `#FFFFFF` puro — sempre usar a paleta acima.
- Roxo, azul-neon, lilás, qualquer "AI gradient".
- Marrom em qualquer superfície que não seja texto.
- Cinzas frios — substituídos por verde escuro 350 C com opacidade.

---

## 3. Typography Rules

```css
@import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600&family=Lato:ital,wght@0,300;0,400;1,300&display=swap');

--f-title: 'Quicksand', sans-serif;   /* títulos, nav, CTAs, labels */
--f-body:  'Lato', sans-serif;        /* parágrafos, descrições, formulário */
```

- **Display / Headlines:** `Quicksand` 500–600, *track-tight* em escalas grandes (`hero-title-xl` ≈ `clamp(3rem, 7vw, 6rem)`), `letter-spacing` `0.14em` em labels e `nav-links` uppercase.
- **Body:** `Lato` 300–400, `line-height` 1.6, **max 65ch** em parágrafos longos. Itálico de `Lato` reservado para palavras em inglês (*clean label*, *private label*) — nunca para ênfase em português.
- **Nav / CTA / meta:** `Quicksand` 500–700, `text-transform: uppercase`, `letter-spacing` 0.12em–0.22em, tamanhos 0.62rem–0.82rem.
- **Hierarquia por peso + cor**, não por escala explosiva. Diferença mínima de 1.25× entre níveis.

### Banido
- `Inter`, `Roboto`, `Open Sans` — todas as alternativas "padrão SaaS".
- Qualquer serif (`Times`, `Georgia`, `Playfair`, `Cormorant`) — o briefing antigo apontava serif editorial, mas a paleta visual oficial migrou para Quicksand+Lato. Não reintroduzir.
- Itálico em palavras em português.
- Pesos 700+ em parágrafos de corpo.

---

## 4. Component Stylings

### Botões
- **Primário (`.btn-dark` / `.nav-cta`):** fundo `--c-accent` (verde 350 C) ou contorno verde 350 C, texto cream/branco, `border-radius: 100px` (pill), `padding: 9px–14px / 22px–26px`, `letter-spacing: 0.12em`, uppercase.
- **Outline:** borda 1.5px em `rgba(0,154,68,.45)`, texto `--c-accent`. Hover: preenche com verde 350 C, texto branco.
- **Hover:** `translateY(-2px)` + sombra mais profunda. **Nunca** glow neon, nunca custom cursor adicional.
- **Floating shop button:** sempre presente em todas as páginas, fixo bottom-right, sombra `0 10px 30px rgba(0,0,0,.18)`, link para `loja.phytonatus.com.br` em nova aba.

### Cards de marca (`.brand-card`)
- Foto full-bleed com `object-fit: cover`, `aspect-ratio` retangular.
- Overlay vertical: `linear-gradient(180deg, transparent 40%, rgba(38,78,54,0.85) 100%)`.
- Nome + descrição empilhados no canto inferior esquerdo, tipografia Quicksand 600.
- Hover: leve `scale(1.02)` na imagem (200ms), nunca o card inteiro.

### Header
- `position: fixed`, transparente sobre hero, `rgba(38,78,54,0.96) + backdrop-filter: blur(12px)` ao scrollar (`#header.scrolled`).
- Logo PNG, altura 42px.
- Mobile (`<760px`): hambúrguer 3-traços, menu fullscreen `--c-bg-escuro`, fonte `clamp(2rem, 6vw, 3.5rem)`.

### Footer
- Duas variantes:
  - **Padrão escuro:** fundo verde 350 C, texto verde claro 7485 C @ 65–95%.
  - **`.footer--light`:** fundo `--c-cream-2` (bege 468 C) com texto marrom — usado na página Contato para separação cromática do formulário.
- Grid 3 colunas: logo · nav · loja. Colapsa para coluna única abaixo de 560px.
- Ícones sociais coloridos no hover com a cor da marca (Instagram rosa, LinkedIn azul, YouTube vermelho) — controlado.

### Inputs (Contato)
- Label acima, `Quicksand` 500 uppercase 0.7rem.
- Input: `Lato` 400, padding 14px, borda 1px `rgba(26,18,8,0.18)`, radius 6px, focus ring `--c-accent` 2px.
- Erro: texto vermelho terracota `#DC241F` (mesma cor do Empório Nuts — reuso intencional), abaixo do input.

### Selos de qualidade
- Carrossel horizontal em Institucional e Private Label, ~5 selos circulares.
- Selos servidos como PNG já padronizados em `assets/images/selos_padronizados/`.

### Wave dividers
- SVG inline entre seções de cor diferente (`wave-up` / `wave-down`).
- Cor do `fill` sempre = cor da seção seguinte — nunca uma terceira cor.
- Altura ~80px desktop, ~40px mobile.

### Preloader
- Fullscreen `radial-gradient` cream + 2 folhas botânicas em SVG (verde 350 C @ 14% opacity) nos cantos diagonais.
- Logo Phytonatus centralizado, linha verde 350 C de 2px expandindo abaixo (`width: 0 → 100%` em 0.8s).
- Fade-out em 0.8s ao DOM ready.

### Cursor abelha (desktop apenas, `min-width: 760px`)
- SVG abelha amarela 44px (cresce para 60px em hover sobre links/botões).
- Dot verde 4px atrás.
- Trail de pontos amarelos (`rgba(241,181,0,.95)` → 0) com fade de 1s.
- **Decisão explícita:** o skill base do Stitch baneia custom cursors. Aqui foi mantido porque é parte da identidade visual aprovada pela Ana (referência à atividade apícola da Phytonatus).

---

## 5. Layout Principles

- **Container padrão:** `width: min(1280px, 94%); margin-inline: auto;`. Em headers/footers: `min(1280px, 94%)`. Hero pode ter `max-width: 1200px` alinhado à esquerda.
- **Spacing rítmico via `clamp()`:** `padding-block: clamp(48px, 6vw, 80px)` para seções grandes; `clamp(0.85rem, 1.4vw, 1.25rem)` para faixas.
- **Faixas full-bleed** alternando `--c-cream` ↔ `--c-cream-2` ↔ `--c-bg-escuro` ↔ verde 350 C, com wave dividers entre elas.
- **Hero alinhado à esquerda** com vídeo de fundo + overlay escuro de gradiente para contraste de texto. Centrado é proibido aqui.
- **Brand cards** em grid 2 colunas desktop, 1 coluna abaixo de 768px. Nunca 3 cards equais lado-a-lado.
- **CSS Grid** preferido para portfólio/marcas e footer. Flexbox para nav, header e botões.
- **Largura máxima de leitura:** parágrafos limitados a 65ch.
- **Min-height fullscreen:** `min-height: 100dvh` em heros — nunca `100vh` puro (salto no iOS Safari).

---

## 6. Responsive Rules

- **Breakpoints principais:** `< 560px` mobile, `< 760px` mobile-cursor-off, `< 1024px` tablet, `≥ 1024px` desktop.
- **Mobile (< 768px):**
  - Todo grid multi-coluna colapsa para 1 coluna.
  - Cursor abelha desligado (`display: none !important`).
  - Hero subtitle some primeiro se necessário.
  - Wave dividers reduzem altura.
- **Touch targets:** mínimo 44×44px em todos botões/links interativos.
- **Tipografia:** headlines via `clamp(2rem, 7vw, 6rem)`, body mínimo `1rem`.
- **Sem scroll horizontal** em nenhum viewport — qualquer overflow é bug.

---

## 7. Motion & Interaction

```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
```

- **Reveal headlines:** wrapper `overflow: hidden`, inner `transform: translateY(110%) → 0` em 0.8s `ease-out`. Aplicado em todos `<h1>/<h2>` principais.
- **Fade in ao scroll:** `opacity: 0; transform: translateY(32px)` → `0` em 0.5s, via IntersectionObserver com `once: true`.
- **Stagger:** grids de marca e cards usam `data-stagger="0.1"` (cascade 100ms entre filhos).
- **Hover de card de marca:** `scale(1.02)` em 200ms, **apenas na imagem**, não no container.
- **Parallax leve:** `data-parallax="0.1"` em imagens de marca — translação Y proporcional ao scroll, GPU via `translate3d`.
- **Preloader breathe:** folhas botânicas com `opacity .8 ↔ 1` + `blur 0 ↔ .5px` em loop 5s.

### Performance
- Animar apenas `transform` e `opacity`. **Nunca** `top`, `left`, `width`, `height`, `margin`.
- `will-change` somente em elementos de animação contínua (cursor-trail, parallax).
- `prefers-reduced-motion: reduce` deve desligar reveals e parallax (atualmente: parcial — TODO).

---

## 8. Iconografia & Imagens

- **Selos:** PNGs padronizados em `assets/images/selos_padronizados/` (último commit `4d6629b`). Não substituir por SVG inline.
- **Logos:** PNGs em `assets/images/Logos e Selos/` — variações por marca. Manter padding de respiro mínimo equivalente à altura da letra "P".
- **Fotos de produto:** texturas de ingrediente (favo, cacau em pó, coco ralado, sal rosa). **NÃO** usar imagens de fruta inteira, árvore, ou produto embalado em seções conceituais — só nas seções de marca específicas.
- **Parceiros / Onde Encontrar:** logos de supermercados em `assets/images/parceiros/` com `mix-blend-mode: multiply` em fundo bege para uniformizar.

---

## 9. Anti-Patterns — NUNCA fazer

### Herdados do skill (mantidos)
- ❌ `#000000` puro ou `#FFFFFF` puro — usar a paleta natural sempre.
- ❌ Inter, Roboto, Open Sans — só Quicksand + Lato.
- ❌ Roxo/lilás/azul-neon — todo o "AI gradient look".
- ❌ Glow externo neon em qualquer botão ou card.
- ❌ Gradient text em headlines (`background-clip: text`).
- ❌ Gradient backgrounds saturados.
- ❌ 3 cards iguais lado a lado — sempre 2 colunas ou grid assimétrico.
- ❌ Hero centralizado — sempre alinhado à esquerda com vídeo/imagem.
- ❌ Modal como primeira escolha de UX — preferir inline/progressive.
- ❌ Emojis em copy ou UI.
- ❌ Bouncing chevron / "Scroll para descobrir" / setas piscando no hero.
- ❌ Animar `width`/`height`/`top`/`left`.
- ❌ Card dentro de card dentro de card.
- ❌ Cinzas frios (`#888`, `#aaa`) — usar verde 350 C com opacidade.

### Específicos da marca Phytonatus
- ❌ **Marrom como fundo de superfície ou bloco.** Marrom só em texto. Sem exceção.
- ❌ Itálico em palavras em português — itálico reservado a *clean label*, *private label* e similares em inglês.
- ❌ Mostrar produtos individualmente como catálogo — o site é conceitual, a venda é na loja Nuvem Shop separada.
- ❌ E-commerce, carrinho, checkout — link externo para `loja.phytonatus.com.br` sempre em nova aba.
- ❌ Página separada para Mel Origens — adiar até dez/jan (decisão da ata 17/04).
- ❌ Misturar paleta de submarca em página de outra marca (ex: vermelho do Nuts dentro de seção do Empório do Mel).
- ❌ Pure black em texto — usar marrom 4625 C `#2C1B0A`.
- ❌ Substituir os selos por placeholders genéricos — usar os PNGs padronizados oficiais.

### Copywriting
- ❌ "Eleve", "Transforme", "Desbrave", "Próxima geração", "Inove" — clichês de AI/marketing.
- ❌ Números falsos redondos tipo 99,99% / 50% / "+1000 clientes" sem fonte.
- ❌ Nomes genéricos em depoimentos ("João Silva", "Maria Santos") — usar nomes reais autorizados pela Ana.

---

## 10. Tokens Resumidos (copy-paste para CSS / Stitch)

```css
:root {
  /* Texto (marrom só aqui) */
  --c-text-primary:   #2C1B0A;   /* Marrom 4625 C */
  --c-text-secondary: #5B4B3A;   /* Marrom Café 462 C */
  --c-text-muted-l:   rgba(38,78,54,0.62);
  --c-text-on-dark:   rgba(210,227,180,0.95);

  /* Fundos */
  --c-cream:        #DDD7C7;   /* Bege 7527 C */
  --c-cream-2:      #DCC9A0;   /* Bege 468 C */
  --c-cream-soft:   #F0E6C5;   /* Bege 7499 C */
  --c-bg-escuro:    #264E36;   /* Verde 350 C — footer/escuro */

  /* Accent */
  --c-accent:       #264E36;   /* Verde Escuro 350 C */
  --c-accent-light: #D2E3B4;   /* Verde Claro 7485 C */

  /* Bordas */
  --c-border-light: rgba(26,18,8,0.12);
  --c-border-dark:  rgba(255,255,255,0.09);

  /* Fontes */
  --f-title: 'Quicksand', sans-serif;
  --f-body:  'Lato', sans-serif;

  /* Sistema */
  --nav-h: 76px;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

---

*Última atualização: 2026-05-14 — baseado em `assets/css/style.css` (1022 linhas) e ata 17/04/2026 com a Ana. Atualizar se a paleta Pantone ou tipografia mudar.*
