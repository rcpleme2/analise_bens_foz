# Acompanhamento de Bens Depositados — Foz do Iguaçu

Painel/dashboard estático para acompanhar a destinação dos bens sob depósito judicial,
com uma página de **resumo geral**, uma página por **depositário** e uma área de
**administração** para cadastrar depositários e registrar o progresso de cada bem.

100% gratuito: é um site estático (HTML/CSS/JS puro, sem build, sem backend pago),
feito para ser hospedado no **GitHub Pages**.

## Estrutura

```
index.html          → Resumo geral (estatísticas e gráficos)
depositarios.html    → Lista de todos os depositários
depositario.html     → Página individual de um depositário (?id=...)
bens.html            → Lista completa de todos os bens, com filtros
admin.html           → Cadastro de depositários e atualização de status/histórico
data/bens.json        → Base de dados dos bens (extraída da planilha original)
data/depositarios.json→ Base de dados dos depositários (começa vazia — cadastre em admin.html)
css/style.css         → Estilos
js/data.js            → Camada de dados (carregamento e utilidades)
js/dashboard.js        → Lógica da página de resumo geral
js/admin.js             → Lógica da área de administração
```

## Como funciona a atualização de dados

Este é um site **estático** (sem servidor/banco de dados pago). O fluxo de trabalho é:

1. O administrador abre `admin.html` (localmente ou no site publicado).
2. Cadastra depositários, atribui bens a eles e registra o progresso (histórico de
   acompanhamento) de cada bem. Essas edições ficam salvas automaticamente no
   **localStorage do navegador** (um rascunho local, visível só para quem está editando).
3. Ao terminar, clica em **"Baixar bens.json"** e **"Baixar depositarios.json"** na
   seção "Exportar dados".
4. Substitui os arquivos `data/bens.json` e `data/depositarios.json` no repositório
   (via `git add/commit/push` ou upload pela interface web do GitHub) e faz o push
   para a branch publicada.
5. O GitHub Pages republica o site automaticamente em ~1 minuto, e todos os
   visitantes passam a ver os dados atualizados.

> Como não há login por depositário, apenas o administrador atualiza os dados —
> exatamente como combinado. Se no futuro for necessário que cada depositário
> atualize sua própria página, dá para evoluir para Supabase/Firebase (autenticação
> + banco gratuito) sem precisar refazer o front-end.

## Como publicar no GitHub Pages (gratuito)

1. No GitHub, vá em **Settings → Pages** deste repositório.
2. Em "Build and deployment", escolha **Deploy from a branch**.
3. Selecione a branch publicada (ex.: `main` ou a branch atual) e a pasta `/ (root)`.
4. Salve. Em alguns minutos o site estará disponível em
   `https://<seu-usuario>.github.io/<nome-do-repositorio>/`.

## Como testar localmente

Como as páginas carregam os arquivos `data/*.json` via `fetch`, é preciso servir os
arquivos por HTTP (abrir o `index.html` direto com `file://` não funciona por causa
do CORS). Rode, na raiz do projeto:

```bash
python3 -m http.server 8000
# depois acesse http://localhost:8000
```

## Modelo de dados

### `data/bens.json`

Cada bem tem os campos extraídos da planilha original (descrição, local, estado de
conservação, tipo, processo, vara, juiz, partes, data de recebimento, observações),
mais:

- `depositario_id`: id do depositário responsável (ou `null` se ainda não atribuído).
- `status_atual`: um de `aguardando`, `andamento`, `concluido`, `nao_localizado`.
- `historico`: lista de registros `{ data, status, tipo_destinacao, observacao }`,
  usada para acompanhar o progresso ao longo do tempo.

### `data/depositarios.json`

`{ id, nome, cpf_cnpj, contato_nome, contato_telefone, contato_email, endereco, observacoes }`

## Próximos passos sugeridos

- Cadastrar os depositários reais em `admin.html` e atribuir os bens a cada um.
- Revisar os dados extraídos da planilha em `data/bens.json` (alguns campos vieram
  de OCR/planilha e merecem conferência, especialmente onde constava "não
  localizadas informações").
