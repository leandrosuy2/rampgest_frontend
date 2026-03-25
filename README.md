<p align="center">
  <img src="src/assets/logo.png" alt="VV Refeições" width="160" />
</p>

# VV Refeições — Sistema de Controle de Reposição

**Repositório no GitHub:** [github.com/leandrosuy2/rampgest_frontend](https://github.com/leandrosuy2/rampgest_frontend)

Aplicação web para **controle e monitoramento de refeições industriais em tempo real**, com foco em **rampas de distribuição**, status dos itens do cardápio e comunicação entre o salão (observador) e a cozinha (monitor).

O sistema foi pensado para operação em ambiente corporativo/refeitório: várias **unidades**, **turnos** (almoço/jantar), **SLA** por tipo de item e **relatórios** para acompanhamento.

---

## O que este projeto faz

### Visão geral

- **Autenticação** de usuários (login/cadastro via Supabase Auth).
- **Unidades**: o usuário pode estar vinculado a uma ou mais unidades; é possível trocar de unidade quando há mais de uma.
- **Papéis por unidade** (`admin`, `observer`, `kitchen`):
  - **Observador** — marca no salão o status dos itens nas rampas (ok, atenção, falta, em preparo, etc.).
  - **Monitor (cozinha)** — acompanha em tempo real o que precisa ser reposto ou preparado.
  - **Administrador** — configura unidades, rampas, cardápio, SLA, usuários, escalas e relatórios.
- **Tempo real**: atualizações via Supabase Realtime (mudanças no status refletem para os demais usuários).
- **PWA**: pode ser instalado no celular ou desktop (`/install` e ícones configurados no Vite).

### Login e senha — o que existe (e o que não existe)

- **Não há usuário e senha padrão neste repositório.** Por segurança, credenciais reais **não** ficam no código nem no README. Quem manda é o **Supabase Auth do seu projeto** (o mesmo apontado no `.env`).
- **Onde fazer login na aplicação**: abra o app (por exemplo `http://localhost:8080` em desenvolvimento) na rota **`/`**. Se você não estiver logado, aparece a tela **“Acesse sua conta”** com duas abas:
  - **Entrar** — informe **e-mail** e **senha** de uma conta que já exista no seu projeto Supabase.
  - **Criar conta** — cadastra um novo e-mail e senha (e nome) no Auth; pode ser necessário **confirmar o e-mail**, dependendo da configuração em **Supabase → Authentication → Providers → Email**.
- **De onde vêm e-mail e senha na prática**:
  1. Alguém **criou a conta** pela aba “Criar conta” no app; ou
  2. Um **admin** convidou pelo **`/admin/users`** (Edge Function `invite-user`); ou
  3. Você criou o usuário manualmente no painel: **Supabase → Authentication → Users → Add user** (definindo senha ou link de convite); ou
  4. Inserção/importação feita pela equipe no Auth (fluxo avançado).
- **Só logar não basta para ver rampas e cardápio**: o usuário precisa de um registro em **`user_units`** ligando o `user_id` a uma **unidade** e a um **papel**. Sem isso, o sistema mostra que você ainda não tem acesso a nenhuma unidade — um **admin** precisa te incluir em **Usuários** ou alguém com acesso ao banco insere o vínculo manualmente.
- **Primeiro acesso / ambiente de testes**: crie um usuário no painel do Supabase (ou pela aba “Criar conta”), copie o **UUID** do usuário em **Authentication → Users**, garanta que exista pelo menos uma linha em **`units`**, e insira uma linha em **`user_units`** com `role = 'admin'` (ou peça para quem já tem admin fazer isso pela tela **`/admin/users`**).

### Usuários e permissões (onde fica e como funciona)

- **Conta de acesso**: cada pessoa é um usuário do **Supabase Auth** (e-mail + senha após o primeiro login). O cadastro inicial pode ser pela tela de login do app ou via **convite** (admin).
- **Perfil**: a tabela **`profiles`** guarda nome e avatar (ligada ao `id` do usuário no Auth).
- **Vínculo com unidade e papel**: a tabela **`user_units`** diz *quem* pode atuar *em qual unidade* e com qual função. Um mesmo e-mail pode ter papéis diferentes em unidades diferentes.
- **Papéis** (`app_role` no banco — rótulos na interface):
  | Valor no banco | Nome na interface |
  |----------------|-------------------|
  | `admin` | Administrador |
  | `observer` | Observador |
  | `kitchen` | Cozinha |
- **Onde gerenciar no sistema**: após entrar com um usuário **administrador** na unidade desejada, acesse **`/admin/users`** (menu **Administração → Usuários**). Lá você:
  - lista usuários da unidade (filtro por unidade se você administra várias);
  - **convida** por e-mail (nome, papel e unidade) — isso chama a **Edge Function** `invite-user`;
  - edita o **papel** de quem já está na unidade;
  - remove o vínculo usuário ↔ unidade quando aplicável.
- **Quem pode abrir `/admin/users`**: só faz sentido para **`admin`**. Observador e cozinha **não** veem o menu de administração completo; o dashboard só mostra atalhos compatíveis com o papel na unidade selecionada.
- **Primeiro administrador**: se o projeto ainda não tiver ninguém em `user_units` com papel `admin`, é preciso criar esse vínculo **no Supabase** (SQL no editor SQL ou inserção na tabela `user_units` com o `user_id` correto) ou usar o painel do Supabase para criar o usuário e depois associar manualmente. Sem pelo menos um admin, a tela de usuários não substitui esse “primeiro passo”.

### Módulos principais (rotas)

| Área | Rota | Descrição |
|------|------|-----------|
| Entrada / login | `/` | Login, seleção de unidade e painel inicial (**Dashboard**). |
| Observador | `/observer`, `/observer/:rampId` | Visão por rampa para marcar status dos itens. |
| Monitor cozinha | `/monitor` | Painel da cozinha em tempo real. |
| Administração | `/admin` | Menu para todas as telas de configuração. |
| Unidades | `/admin/units` | CRUD de unidades. |
| Rampas e slots | `/admin/ramps` | Configuração de rampas e posições (slots) do buffet. |
| Alimentos | `/admin/food-items` | Catálogo de itens por unidade. |
| Cardápio | `/admin/menu` | Montagem do cardápio do dia e vínculo com status atual. |
| SLA | `/admin/sla` | Regras de tempo (SLA) por contexto. |
| Usuários | `/admin/users` | Gestão de usuários; convites usam a **Edge Function** `invite-user`. |
| Escalas | `/admin/schedules` | Agendamento de turnos. |
| Relatórios | `/admin/reports` | Relatórios e métricas. |
| Estatísticas | `/dashboard` | Dashboard de estatísticas (uso conforme permissões). |
| Perfil | `/profile` | Perfil do usuário (inclui upload no Storage do Supabase, quando configurado). |
| Instalar app | `/install` | Instruções / fluxo para instalar o PWA. |

---

## Stack técnica

| Camada | Tecnologia |
|--------|------------|
| Frontend | [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| Build / dev | [Vite 5](https://vitejs.dev/) |
| UI | [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/) |
| Roteamento | [React Router v6](https://reactrouter.com/) |
| Dados remotos | [Supabase JS](https://supabase.com/docs/reference/javascript/introduction) (Auth, Postgres, Realtime, Storage) |
| Estado assíncrono | [TanStack Query](https://tanstack.com/query) |
| Validação de formulários | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) |
| PWA | [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) |
| Testes | [Vitest](https://vitest.dev/) + Testing Library |

**Banco de dados**: **PostgreSQL** gerenciado pelo **Supabase** (esquema e políticas nas pastas `supabase/migrations` e script de referência `database-structure.sql`).

**Backend serverless**: função Edge **invite-user** em `supabase/functions/invite-user/` (convite de usuários com permissões de admin no Supabase).

---

## Pré-requisitos

1. **Node.js** (recomendado LTS atual, por exemplo 20.x ou 22.x) — [nodejs.org](https://nodejs.org/)
2. **npm** (vem com o Node) ou **pnpm** / **yarn**, se preferir
3. Um **projeto Supabase** com o banco e as migrations aplicadas (ou o mesmo projeto já ligado às variáveis de ambiente abaixo)

---

## Como rodar o projeto localmente

### 1. Obter o código

Se estiver em um repositório Git:

```bash
git clone https://github.com/leandrosuy2/rampgest_frontend.git
cd rampgest_frontend
```

Se já estiver na pasta do projeto, siga a partir do passo 2.

### 2. Instalar dependências

Na raiz do projeto:

```bash
npm install
```

### 3. Configurar variáveis de ambiente

Na raiz existe um arquivo **`.env`** (não commite segredos em repositórios públicos). Ele deve expor variáveis com prefixo **`VITE_`** para o Vite injetar no frontend.

Crie ou edite `.env` com:

```env
VITE_SUPABASE_PROJECT_ID="seu-project-ref"
VITE_SUPABASE_URL="https://SEU_PROJECT_REF.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sua-chave-anon-publica"
```

- **`VITE_SUPABASE_URL`**: URL do projeto em **Project Settings → API** no painel do Supabase.
- **`VITE_SUPABASE_PUBLISHABLE_KEY`**: chave **anon** / **public** (é a chave pensada para o browser; não use a *service role* no frontend).
- **`VITE_SUPABASE_PROJECT_ID`**: identificador do projeto (referência; o cliente principal usa URL + chave).

Sem essas variáveis, o app não consegue falar com o Supabase.

### 4. Banco de dados e funções

- As migrações SQL ficam em **`supabase/migrations/`**. Em um fluxo típico com CLI do Supabase, você as aplica no projeto remoto ou local conforme a documentação do Supabase.
- O arquivo **`database-structure.sql`** descreve a estrutura completa (útil para revisão ou migração manual).
- A função **`invite-user`** exige secrets no Supabase (`SUPABASE_URL`, service role, anon key, etc.) configurados no deploy da Edge Function — necessária para **convidar usuários** pela tela de admin.

Se o seu `.env` apontar para um projeto já provisionado (com dados e políticas RLS corretas), o front pode subir direto.

### 5. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Por padrão o **Vite** está configurado para:

- **Porta `8080`**
- Aceitar conexões na interface configurada (`host` amplo para acesso na rede local, se precisar testar no celular)

Abra no navegador: **http://localhost:8080**

Alguns ambientes (por exemplo IDEs na nuvem ou **supervisord**) executam **`npm start`** em vez de `npm run dev`. Neste projeto, `npm start` sobe o **mesmo servidor Vite** em `0.0.0.0:8080`. Para servir o **build de produção** (`dist/`), use `npm run build` e depois `npm run preview` (porta **8080** via `vite.config.ts`).

### 6. Build para produção

Gera os arquivos estáticos em `dist/`:

```bash
npm run build
```

Pré-visualizar o build localmente:

```bash
npm run preview
```

### 7. Outros comandos úteis

| Comando | Função |
|---------|--------|
| `npm start` | Servidor Vite (dev) em `0.0.0.0:8080` — para plataformas que só chamam `start` |
| `npm run lint` | Executa o ESLint no projeto |
| `npm run test` | Roda os testes (Vitest) uma vez |
| `npm run test:watch` | Testes em modo observação |
| `npm run build:dev` | Build em modo `development` |

---

## Deploy (visão geral)

O resultado de `npm run build` é um site **estático** (`dist/`). Você pode publicar em qualquer hospedagem que sirva SPA (Netlify, Vercel, Cloudflare Pages, S3 + CloudFront, etc.).

**Importante:** configure as **mesmas variáveis `VITE_*`** no painel da hospedagem (ambiente de build e, se necessário, runtime conforme a plataforma).

---

## Estrutura de pastas (resumo)

```
reposicao/
├── src/                    # Código React (páginas, hooks, componentes)
├── src/integrations/supabase/  # Cliente Supabase e tipos gerados
├── supabase/
│   ├── migrations/         # Migrações SQL do Postgres
│   └── functions/          # Edge Functions (ex.: invite-user)
├── public/                 # Assets estáticos
├── database-structure.sql    # Referência da estrutura do banco
├── vite.config.ts          # Vite + PWA (porta 8080)
└── .env                    # Variáveis locais (não versionar segredos)
```

---

## Licença

Defina a licença e os créditos conforme a política da sua organização (por exemplo, adicionando um arquivo `LICENSE` na raiz do repositório).
