# Deploy de demonstração

Guia para colocar o site no ar de graça, para demonstração e piloto. São três serviços, cada um cuidando de uma parte:

| Parte | Serviço | Por quê |
|---|---|---|
| Banco de dados | **Aiven** (MySQL grátis) | MySQL 8 de verdade: a busca FULLTEXT funciona sem mudança. Grátis sem prazo, 1 GB. |
| Imagens | **Cloudflare R2** | O disco do servidor grátis é apagado a cada reinício; as imagens precisam ficar fora dele. 10 GB grátis. |
| Backend e frontend | **Render** | Backend como "Web Service" grátis e frontend como "Static Site" grátis, ligados ao GitHub. |

**Limites do plano grátis que você vai notar:**
- O backend no Render **dorme depois de 15 minutos sem uso** e leva cerca de 1 minuto para acordar. A tela de login avisa "O servidor está iniciando…". Antes de uma demonstração, abra o site um minuto antes. O plano pago mais barato do Render acaba com isso.
- A Aiven pode **desligar o banco se ficar muito tempo sem uso** (avisa por e-mail antes; dá para religar no painel).
- O endereço público `r2.dev` das imagens tem limite de uso e é pensado para testes. Para o piloto serve; com uso de verdade, o certo é ligar um domínio próprio ao bucket.

Os nomes dos botões nos painéis podem mudar com o tempo; se algo não bater, procure pelo nome parecido.

A ordem importa: banco → imagens → backend → frontend → voltar no backend para liberar o CORS.

---

## 1. Banco de dados (Aiven)

1. Crie uma conta em aiven.io e um serviço **MySQL** no plano **Free**.
2. Quando o serviço estiver "Running", abra a página dele e anote em **Connection information**: `Host`, `Port`, `User` (normalmente `avnadmin`) e `Password`.
3. Na mesma área, baixe o **CA certificate** (arquivo `ca.pem`). Ele é o que permite a conexão criptografada.
4. Crie as tabelas pelo **MySQL Workbench**:
   - Nova conexão com o host, porta, usuário e senha da Aiven.
   - Aba **SSL**: "Use SSL" = **Require**, e em "SSL CA File" escolha o `ca.pem`.
   - Conecte e rode o arquivo inteiro `database/tutorial biblioteca.sql`. Ele já cria o banco `biblioteca_tutoriais` com tudo das migrações 001 a 003 — **não rode as migrações** num banco novo.

## 2. Imagens (Cloudflare R2)

1. Crie uma conta em cloudflare.com e abra **R2** no menu. A Cloudflare pode pedir um meio de pagamento mesmo no plano grátis (é verificação; dentro de 10 GB não há cobrança).
2. Crie um bucket, por exemplo `biblioteca-imagens`.
3. Nas configurações do bucket, ative o **acesso público pelo endereço r2.dev** (Public Development URL). Copie o endereço, algo como `https://pub-xxxxxxxx.r2.dev`. Esse é o `R2_PUBLIC_URL`.
4. Em **Manage R2 API Tokens → Create API token**:
   - Permissão **Object Read & Write**, restrita **só a esse bucket**.
   - Copie na hora o **Access Key ID** e o **Secret Access Key** (o secret só aparece uma vez).
5. Anote o **Account ID**, que aparece na página do R2.

## 3. Backend (Render, Web Service)

1. Crie uma conta em render.com entrando com o GitHub e dê acesso ao repositório.
2. **New → Web Service**, escolha o repositório e preencha:
   - **Root Directory:** `backend`
   - **Runtime:** Python
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** Free
3. Em **Environment**, cadastre as variáveis (as mesmas do `backend/.env.example`):

   | Variável | Valor |
   |---|---|
   | `PYTHON_VERSION` | a mesma versão que você usa localmente (veja com `python --version`, ex.: `3.12.7`) |
   | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` | os da Aiven |
   | `DB_NAME` | `biblioteca_tutoriais` |
   | `DB_SSL_CA` | `/etc/secrets/ca.pem` |
   | `SECRET_KEY` | uma chave **nova**, gerada com `python -c "import secrets; print(secrets.token_urlsafe(64))"` (não reaproveite a do seu `.env` local) |
   | `ALGORITHM` | `HS256` |
   | `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` |
   | `STORAGE_BACKEND` | `r2` |
   | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` | os do R2 |
   | `CORS_ORIGINS` | deixe `http://localhost:5173` por enquanto (troca no passo 5) |

4. Ainda em **Environment**, em **Secret Files**, crie um arquivo chamado `ca.pem` e cole o conteúdo do `ca.pem` da Aiven. O Render o disponibiliza em `/etc/secrets/ca.pem`, que é o caminho do `DB_SSL_CA`.
5. Crie o serviço e espere o deploy. Teste abrindo `https://SEU-BACKEND.onrender.com/` (deve responder "API da Biblioteca de Tutoriais rodando") e `/docs`.

Se a API não subir, o log do Render mostra o motivo. Variável faltando aparece como erro de validação com o nome dela; armazenamento incompleto aparece como `STORAGE_BACKEND=r2 exige: ...`; certificado faltando aparece como `DB_SSL_CA aponta para ..., mas esse arquivo não existe` (o Secret File `ca.pem` precisa estar no serviço do **backend**, não no do frontend).

## 4. Frontend (Render, Static Site)

1. **New → Static Site**, mesmo repositório:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm ci && npm run build`
   - **Publish Directory:** `dist`
2. Em **Environment**: `VITE_API_URL` = `https://SEU-BACKEND.onrender.com` (sem `/` no fim).
3. Crie o site e anote o endereço dele (ex.: `https://SEU-FRONTEND.onrender.com`).

O `VITE_API_URL` entra no código **na hora do build**. Se mudar o valor depois, faça um novo deploy do frontend ("Manual Deploy").

## 5. Liberar o frontend na API (CORS)

No Web Service do backend, troque `CORS_ORIGINS` por:

```
https://SEU-FRONTEND.onrender.com,http://localhost:5173
```

Sem `/` no fim de cada endereço. Salve: o Render faz um novo deploy sozinho. Sem esse passo, o navegador bloqueia as chamadas e o login mostra "Não foi possível conectar ao servidor".

## 6. Teste final

No endereço do frontend: criar conta, criar workspace, categoria e tutorial **com imagem**, abrir a imagem, apagar o tutorial. Depois confira no painel do R2 que a imagem apareceu no bucket e sumiu quando o tutorial foi apagado.

## Atualizações depois do primeiro deploy

- **Código:** cada merge no `main` faz o Render publicar de novo, backend e frontend.
- **Banco:** migração nova em `database/migrations/` precisa ser rodada **também na Aiven**, pelo Workbench com a conexão SSL. O Render não roda SQL sozinho.
