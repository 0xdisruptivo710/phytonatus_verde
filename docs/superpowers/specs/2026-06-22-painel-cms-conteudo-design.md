# Painel de Conteúdo (CMS leve) — Phytonatus

**Data:** 2026-06-22
**Status:** Desenho aprovado, aguardando revisão do spec
**Autor:** Brainstorm com a equipe (dev: 0xdisruptivo710)

---

## 1. Contexto

O site da Phytonatus é **100% estático**: 7 páginas HTML (`index`, `institucional`, `marcas`, `onde-encontrar`, `private-label`, `politica-privacidade`, `contato`), com `style.css`, `script.js` e imagens em `assets/images/`. Não há framework, build, nem banco. O deploy é automático: commit no GitHub → Vercel publica. Já existe uma função serverless (`api/contact.js`, Resend) para o formulário de contato.

Hoje, qualquer ajuste de texto ou troca de imagem exige editar HTML na mão e commitar — só o dev consegue. Sintoma recente: uma imagem foi adicionada manualmente em `assets/images/lojas/`.

## 2. Objetivo

Dar à **equipe (não-técnica) da Phytonatus** um painel simples para **editar textos e trocar imagens** das páginas que já existem, sem mexer em código e sem risco de quebrar o layout.

## 3. Escopo

### Dentro (v1)
- Editar **textos** existentes nas páginas (títulos/hero, subtítulos, parágrafos de conteúdo).
- **Trocar imagens** existentes (banners de hero, fotos, e também logos individuais dentro dos grids de parceiros/marcas/selos — substituir o arquivo de um slot que já existe).
- **Login** por senha única compartilhada.
- **Salvar publica direto** (commit → Vercel republica em ~1 min).
- **Histórico / Desfazer** (reverter a última alteração via Git).

### Fora (v1) — YAGNI
- **Adicionar/remover itens** de listas (ex.: incluir um novo parceiro no grid, criar nova loja). Trocar a imagem de um slot existente está dentro; criar um slot novo está fora.
- Criar páginas/posts novos (blog, novidades).
- Login por usuário / contas individuais / Google OAuth.
- Fluxo de rascunho/aprovação (staging). Salvar é publicar.
- Edição de menu, rodapé, estrutura de layout, CSS.

## 4. Princípios

- **Mantém o site estático.** Nada de banco, nada de runtime dinâmico para o visitante. O conteúdo continua morando no HTML versionado no Git.
- **Curado e seguro.** Só é editável o que estiver explicitamente marcado. O resto é intocável pelo painel.
- **Edição cirúrgica.** Ao salvar, mexemos só no trecho marcado — sem reescrever/reformatar o HTML inteiro (diffs limpos, zero risco de "estragar" markup ao redor).
- **Segredos no servidor.** Token do GitHub e senha só existem como variáveis de ambiente nas funções serverless; nunca chegam ao navegador.
- **Rede de segurança via Git.** Toda alteração é um commit → sempre reversível.

## 5. Arquitetura

Tudo no **mesmo repositório e mesmo projeto Vercel** (`phytonatusv2`, branch `main`).

```
/admin/                 → painel (estático, vanilla JS) — gated por login
  index.html
  app.js
  style.css
/api/admin/             → funções serverless (Node)
  login.js              → autentica (senha), cria cookie de sessão
  fields.js             → lê o HTML no GitHub e devolve o manifesto de campos editáveis
  save-text.js          → patch cirúrgico de texto + commit
  save-image.js         → otimiza imagem (sharp) + commit + ajusta src
  revert.js             → desfazer (reverte commit de conteúdo)
/lib/cms.js             → compartilhado: cliente GitHub, parse/patch de HTML, sessão/auth
package.json            → novo (deps das funções)
vercel.json             → ajustado (rotas /admin e /api/admin/*)
```

### Fonte da verdade: GitHub via API
Tanto **leitura** (mostrar valor atual de cada campo) quanto **escrita** (salvar) passam pela **API do GitHub** contra `0xdisruptivo710/phytonatusv2`, branch `main`. Motivo: o site publicado pode estar ~1 min atrás do último commit; usar o GitHub como fonte única evita drift e garante que a escrita use o `sha` correto do arquivo. O site que o visitante vê é o artefato de build desse mesmo branch, então fica consistente após o deploy.

## 6. Mecanismo de edição (o coração)

### 6.1 Marcação no HTML (passo de anotação)
Numa passada inicial pelas 7 páginas, marcamos os elementos do conjunto curado com atributos:

```html
<!-- texto -->
<h1 class="hero-title" data-cms="marcas.hero_titulo" data-cms-label="Marcas — título do hero">Parceiros Comerciais.</h1>

<!-- imagem -->
<img class="parceiro-card-img" data-cms-img="onde-encontrar.loja_natural" data-cms-label="Onde encontrar — foto loja natural" src="assets/images/lojas/loja-natural.png" alt="Loja natural">
```

- `data-cms` (texto) / `data-cms-img` (imagem): id estável no formato `pagina.campo`.
- `data-cms-label`: rótulo amigável que a equipe vê no painel.
- Agrupamento por página vem do arquivo onde o atributo está.
- **Só elementos marcados são editáveis.** Adicionar um campo no futuro = adicionar um atributo.

### 6.2 Listar campos (`fields.js`)
1. Verifica o cookie de sessão (senão, 401).
2. Busca o conteúdo das 7 páginas HTML no GitHub.
3. Faz parse e coleta todos os `data-cms`/`data-cms-img`, montando o manifesto: `[{ page, id, type: 'text'|'image', label, currentValue }]` agrupado por página.
4. Devolve ao painel.

### 6.3 Salvar texto (`save-text.js`) — patch cirúrgico
Para **não reserializar o HTML inteiro** (o que poderia reformatar markup hand-tuned), usamos **parse5 com informação de localização no código-fonte** (`sourceCodeLocationInfo: true`):
1. Recebe `{ id, value }` (+ sessão).
2. Busca o arquivo da página no GitHub (guarda o `sha`).
3. Faz parse com localização, acha o nó com `data-cms === id`, pega os offsets do **conteúdo interno** (entre o fim da tag de abertura e o início da tag de fechamento).
4. Substitui **apenas esse trecho** na string original pelo novo texto (escapado para HTML). Todo o resto do arquivo fica byte a byte igual.
5. Commita o arquivo via API (`PUT /contents`, usando o `sha`). Mensagem: `content: atualiza <id> via painel`.

### 6.4 Salvar imagem (`save-image.js`)
1. Recebe `{ id, fileBase64, mimeType }` (+ sessão).
2. **Limite de corpo da Vercel (~4.5 MB):** o painel **pré-redimensiona no navegador (canvas)** antes de enviar, garantindo que o upload caiba; o servidor re-otimiza de forma autoritativa.
3. Valida tipo (whitelist: png/jpg/webp) e tamanho.
4. **Otimiza com `sharp`** (cap de largura + compressão; opcionalmente respeitando as dimensões por slot do `MEDIDAS-IMAGENS.md`). Saída em caminho determinístico por campo: `assets/images/cms/<id>.<ext>`.
5. Commita o binário via API.
6. Garante que o `src` do elemento `data-cms-img` aponte para esse caminho (mesmo patch cirúrgico do 6.3, só na 1ª vez; trocas seguintes só substituem o arquivo). *Cache-busting* via `?v=<hash-curto>` no `src` quando necessário.

### 6.5 Desfazer (`revert.js`) + Histórico
- Aba "Histórico" no painel lista os últimos commits de conteúdo (mensagens `content: ...`) via API.
- Botão **Desfazer** reverte o commit selecionado (cria um commit de reversão na API). Republicação automática como qualquer save.

## 7. Login e segurança

- **Senha única** guardada como **hash** em env var (`ADMIN_PASSWORD_HASH`); comparação por hash (sem senha em texto puro no código/repo).
- `POST /api/admin/login` valida a senha → devolve **cookie de sessão assinado** (HMAC com `SESSION_SECRET`, `HttpOnly`, `Secure`, `SameSite=Strict`, expiração curta).
- **Todas** as funções de escrita (`save-text`, `save-image`, `revert`) e `fields` exigem o cookie válido.
- `GITHUB_TOKEN` (PAT fine-grained, escopo só deste repo, permissão de conteúdo r/w) usado **apenas** no servidor.
- `/admin` com `<meta name="robots" content="noindex,nofollow">`.

## 8. Variáveis de ambiente (Vercel)

| Nome | Uso |
|------|-----|
| `ADMIN_PASSWORD_HASH` | hash da senha compartilhada |
| `SESSION_SECRET` | assina o cookie de sessão |
| `GITHUB_TOKEN` | PAT fine-grained (repo `phytonatusv2`, conteúdo r/w) |
| `RESEND_API_KEY` | já existe (formulário de contato) |

Constantes fixas no código (não-segredas): `GITHUB_REPO=0xdisruptivo710/phytonatusv2`, `GITHUB_BRANCH=main`.

## 9. Dependências e mudanças no repo

- **Novo `package.json`** com: `parse5` (parse + patch cirúrgico), `sharp` (imagens), `@octokit/rest` (API GitHub). Sessão/hash usam o `crypto` nativo do Node — sem dep extra.
- **`vercel.json`**: garantir build estático de `admin/**`, build das funções `api/**/*.js` (já coberto), e rota servindo `/admin`. Manter intactas as rotas e a função de contato atuais.
- **Passo de anotação**: adicionar atributos `data-cms*` ao conjunto curado nas 7 páginas (sem mudar o visual).

## 10. Fluxo de dados

```
Navegador (/admin)
  → POST com cookie de sessão
    → Função serverless (api/admin/*)
      → API GitHub (lê arquivo+sha → patch cirúrgico/otimiza → commita)
        → GitHub (phytonatusv2:main)
          → Vercel build/deploy automático
            → Site público reflete a mudança (~1 min)
```

## 11. Tratamento de erros

- **401** se sessão ausente/expirada → painel manda voltar pro login.
- **Senha incorreta** → mensagem clara, sem vazar detalhe.
- **Conflito de `sha` (409)** → re-busca o arquivo e tenta 1x; se persistir, avisa "alguém editou ao mesmo tempo, recarregue".
- **Imagem inválida/grande** → barrada antes do `sharp`, com mensagem do tipo/limite.
- **Falha de API GitHub / rate limit** → 5xx com mensagem amigável em PT e orientação de tentar de novo.
- Risco de edição concorrente é baixo (equipe pequena); escrita por `sha` evita sobrescrita silenciosa.

## 12. Plano de testes

- **Unitário** (funções puras): patch cirúrgico de texto (fixtures de HTML → confere que só o trecho mudou e o resto é idêntico) e otimização `sharp` (entra X, sai dentro do limite/formato).
- **Sessão/auth**: cookie válido/inválido/expirado.
- **Integração (branch sandbox)**: apontar `GITHUB_BRANCH` para um branch de teste e exercitar save-text/save-image/revert end-to-end antes de liberar em `main`.
- **QA manual** via skill `/browse` (gstack): login → editar texto → conferir commit + deploy + mudança no ar; subir imagem → conferir otimização + troca; desfazer → conferir reversão.

## 13. Riscos e decisões

- **Reserialização de HTML** → mitigada por patch cirúrgico com parse5 + offsets (não reserializa o doc).
- **Crescimento do histórico Git com imagens** → aceitável para o volume (trocas ocasionais; caminho fixo mantém a árvore de trabalho pequena). Se crescer demais no futuro, migrar imagens para Vercel Blob/storage externo.
- **Limite de corpo da Vercel no upload** → pré-redimensionamento no navegador antes do envio.
- **`main` local rastreia `verde/main`** (observação de setup): irrelevante para o painel, que escreve direto via API no `phytonatusv2`. Só ficar atento ao sincronizar o working copy local.
- **Senha compartilhada** → sem atribuição de "quem editou"; aceitável no v1 (histórico Git registra o quê e quando). Evoluível para usuários nomeados depois.

## 14. Conjunto inicial de campos (curado — refinar na implementação)

Ponto de partida a confirmar página a página durante a implementação:
- **index**: textos do hero (eyebrow/título/subtítulo), chamadas das seções principais, imagem(ns) de destaque.
- **institucional**: título/subtítulo, parágrafos do texto institucional, imagem(ns).
- **marcas**: hero, descrições dos blocos de marca, imagens das marcas existentes.
- **onde-encontrar**: hero, banner, imagens de lojas/parceiros existentes.
- **private-label**: hero, blocos de texto, imagens.
- **politica-privacidade**: (provável fora — texto jurídico raramente muda; decidir).
- **contato**: textos de apoio (sem mexer na lógica do formulário).

> Grids (parceiros/selos/marcas): cada imagem já existente vira um slot trocável; **incluir item novo fica fora do v1**.

---

## Próximos passos
1. Revisão deste spec pelo dev.
2. Skill `writing-plans` → plano de implementação detalhado.
