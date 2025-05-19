# API de Áudio do YouTube

API para buscar vídeos no YouTube e baixar o áudio em formato MP3.

## Endpoints

- `GET /search?q=termo-de-busca` - Busca vídeos no YouTube
- `GET /audio/:videoId` - Baixa o áudio de um vídeo em formato MP3

## Executando Localmente

1. Certifique-se de ter o Node.js instalado (preferencialmente versão 18.x)
2. Clone o repositório e navegue até a pasta do projeto
3. Instale as dependências:
   ```
   npm install
   ```
4. Execute o servidor de desenvolvimento:
   ```
   npm run dev
   ```
5. O servidor estará disponível em http://localhost:3000
6. Para testar:
   - Busca: http://localhost:3000/search?q=sua-busca
   - Áudio: http://localhost:3000/audio/ID_DO_VIDEO
   - Interface web de teste: Abra o arquivo `test.html` no navegador para uma interface amigável

## Deploy no Render.com

1. Crie uma conta no [Render.com](https://render.com)
2. No dashboard, clique em "New Web Service"
3. Conecte ao seu repositório GitHub
4. Configure seu serviço:
   - Nome: youtube-audio-api (ou o nome desejado)
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Selecione o plano gratuito
6. Clique em "Create Web Service"

A API estará disponível em poucos minutos em um domínio `.onrender.com`. 