# API de Áudio do YouTube

API para buscar vídeos no YouTube e baixar o áudio em formato MP3.

## Como Funciona

Esta API usa:
- YouTube-SR para buscar vídeos no YouTube
- Y2mate.is como serviço de conversão para MP3
  - Redireciona para a página de download do Y2mate.is
  - Utiliza o método direto do site para evitar problemas de API
- Express.js para criar as rotas da API

## Endpoints

- `GET /search?q=termo-de-busca` - Busca vídeos no YouTube
- `GET /audio/:videoId` - Redireciona para o download do áudio em formato MP3

## Executando Localmente

1. Certifique-se de ter o Node.js instalado
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

## Problemas Conhecidos e Soluções

### Sobre a integração com Y2mate.is
Esta implementação utiliza redirecionamento direto para a página de download do Y2mate.is.
Em vez de usar a API direta do serviço (que requer tokens CSRF), redirecionamos o usuário 
para a página de download oficial, o que proporciona maior confiabilidade.

### Erros CORS
Se encontrar erros CORS ao testar no navegador:
- Abra o arquivo `test.html` diretamente no navegador, sem usar um servidor local
- Verifique se a configuração CORS no servidor está correta
- Ao fazer deploy, certifique-se de atualizar a URL da API no arquivo `test.html`

### Problemas com Serviços de Hospedagem
A implementação atual usa redirecionamento para o serviço Y2mate.is, evitando requisições
diretas ao YouTube. Isso deve permitir um funcionamento mais confiável em provedores de 
hospedagem como Vercel.

## Deploy no Vercel

1. Crie uma conta no [Vercel](https://vercel.com)
2. Instale a CLI da Vercel:
   ```
   npm install -g vercel
   ```
3. No diretório do projeto, execute:
   ```
   vercel
   ```
4. Siga as instruções para fazer login e configurar seu projeto
5. Após o deploy, atualize a URL da API no arquivo `test.html`

A API estará disponível no domínio fornecido pela Vercel. 