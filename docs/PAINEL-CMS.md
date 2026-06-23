# Painel de Conteúdo — Phytonatus (`/admin`)

Painel para a equipe **editar textos e trocar imagens** do site sem mexer em código.
Cada alteração vira um commit no GitHub (`phytonatusv2:main`) e a Vercel republica em ~1 min.
Tudo é reversível pelo histórico.

---

## 1. Setup (uma vez só — feito por você, o dev)

### 1.1 Gerar o hash da senha da equipe
Escolha uma senha forte e gere o hash (troque `SUA_SENHA`):

```bash
node -e "console.log(require('crypto').createHash('sha256').update('SUA_SENHA').digest('hex'))"
```

Guarde a saída (64 caracteres). **A senha em si nunca vai pro código** — só o hash.

### 1.2 Gerar o segredo da sessão

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 1.3 Criar o GitHub token (fine-grained PAT)
GitHub → **Settings → Developer settings → Fine-grained tokens → Generate new token**:
- **Resource owner:** `0xdisruptivo710`
- **Repository access:** Only select repositories → **`phytonatusv2`**
- **Permissions → Repository → Contents:** **Read and write**
- Gere e copie o token (`github_pat_...`).

### 1.4 Configurar as variáveis na Vercel
Projeto na Vercel → **Settings → Environment Variables** (marque **Production** e **Preview**):

| Variável | Valor |
|----------|-------|
| `ADMIN_PASSWORD_HASH` | hash do passo 1.1 |
| `SESSION_SECRET` | passo 1.2 |
| `GITHUB_TOKEN` | passo 1.3 |

(`RESEND_API_KEY` já existe, do formulário de contato.)

> Opcionais (têm padrão no código): `GITHUB_REPO=0xdisruptivo710/phytonatusv2`, `GITHUB_BRANCH=main`.

---

## 2. Testar com segurança (antes de ir pra produção)

A branch de feature gera um **deploy de preview** na Vercel. Para testar **sem publicar em produção**, faça o painel commitar na própria branch de teste:

1. Suba a branch:
   ```bash
   git push -u origin feat/painel-cms-conteudo
   ```
2. Na Vercel, **só no ambiente Preview**, adicione `GITHUB_BRANCH = feat/painel-cms-conteudo`.
3. Abra `<url-de-preview>/admin` e rode o checklist abaixo.
4. Ao validar, **remova** essa override (volta a `main`) e faça o merge.

### Checklist de teste (`<preview>/admin`)
1. **Login** — senha errada → "senha incorreta"; senha certa → entra no painel.
2. **Editar texto** — mude um texto, **Salvar** → toast de sucesso. Em ~1 min, recarregue a página pública e confira. No GitHub deve aparecer o commit `content: atualiza ... via painel`.
3. **Trocar imagem** — envie um PNG/JPG, **Enviar** → a miniatura troca. No GitHub: arquivo novo em `assets/images/cms/<id>.webp` e o `src` atualizado na página.
4. **Histórico / Desfazer** — aba **Histórico** lista as alterações; **Desfazer** reverte e some do site em ~1 min.
5. **Segurança** — abrir `<preview>/api/admin/fields` sem login (aba anônima) → deve retornar **401**.

---

## 3. Como a equipe usa (dia a dia)
1. Acessa `https://<dominio>/admin`.
2. Digita a senha.
3. Aba **Editar**: acha o campo (agrupado por página), muda o texto **ou** sobe uma imagem, clica em **Salvar/Enviar**.
4. A mudança aparece no site em ~1 minuto.
5. Errou? Aba **Histórico → Desfazer**.

Comunique a senha por um canal seguro (não por e-mail aberto).

---

## 4. Como adicionar um novo campo editável
No HTML da página, marque o elemento:
- **Texto** (só em elemento com texto puro, sem tags dentro):
  ```html
  <p class="body-lead" data-cms="home.intro" data-cms-label="Home — texto de introdução">...</p>
  ```
- **Imagem** (em `<img>` com `src`):
  ```html
  <img data-cms-img="home.banner" data-cms-label="Home — banner" src="assets/images/x.png" alt="...">
  ```
Valide com `node scripts/check-fields.mjs <pagina>.html`. Pronto — o painel passa a mostrar o campo.

---

## 5. Limitações conhecidas (v1)
- **Listas que crescem** (adicionar um novo parceiro/loja/marca) ficam fora — o painel edita/troca o que já existe, não cria itens novos.
- **Fundos via `background-image` inline** não são editáveis (só `<img>` reais).
- **Desfazer** reverte alterações em arquivos existentes; não desfaz a *criação* do 1º arquivo de imagem de um slot (fica órfão, inofensivo).
- **Senha única compartilhada**: o histórico registra *o que* e *quando*, não *quem*.
