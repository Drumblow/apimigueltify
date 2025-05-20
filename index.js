const express = require('express');
const cors = require('cors');
const YouTubeSR = require('youtube-sr').default;
const { Innertube, ClientType } = require('youtubei.js');

const app = express();
const port = process.env.PORT || 3000;

// Habilitar CORS para todas as origens
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/search', async (req, res) => {
  const searchQuery = req.query.q;

  if (!searchQuery) {
    return res.status(400).json({ error: 'O parâmetro de busca \'q\' é obrigatório.' });
  }

  try {
    const searchResults = await YouTubeSR.search(searchQuery, { limit: 10, type: 'video' });

    if (!searchResults || searchResults.length === 0) {
      return res.status(404).json({ error: 'Nenhum vídeo encontrado para a busca.' });
    }

    const videosInfo = searchResults.map(video => ({
      id: video.id,
      title: video.title,
      thumbnail: video.thumbnail ? video.thumbnail.url : null,
      duration: video.durationFormatted,
      url: `https://www.youtube.com/watch?v=${video.id}`
    }));

    res.json({ results: videosInfo });

  } catch (error) {
    console.error('Erro ao buscar vídeos:', error);
    res.status(500).json({ error: 'Erro interno ao buscar vídeos.' });
  }
});

app.get('/audio/:videoId', async (req, res) => {
  const videoId = req.params.videoId;

  if (!videoId || !/^\w{11}$/.test(videoId)) {
    return res.status(400).json({ error: 'ID de vídeo inválido.' });
  }

  console.log(`Tentando obter áudio para ${videoId} usando youtubei.js com client IOS`);

  try {
    const youtube = await Innertube.create({
      client_type: ClientType.IOS,
    });

    console.log('Iniciando download do áudio...');
    const stream = await youtube.download(videoId, {
      type: 'audio',
      quality: 'best',
      format: 'any',
      client: 'IOS'
    });

    if (!stream) {
      console.error('Falha ao obter o stream de áudio com IOS.');
      return res.status(500).json({ error: 'Não foi possível obter o stream de áudio.' });
    }

    console.log('Stream de áudio obtido. Enviando para o cliente...');
    
    res.setHeader('Content-Type', 'audio/aac');
    res.setHeader('Content-Disposition', `attachment; filename="${videoId}_audio.aac"`);

    for await (const chunk of stream) {
      res.write(chunk);
    }
    res.end();
    console.log('Áudio enviado com sucesso.');

  } catch (error) {
    console.error(`Erro detalhado ao processar /audio/${videoId} com youtubei.js (IOS):`, error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno ao processar o áudio.';
    let errorDetails = {};

    if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails.name = error.name;
        errorDetails.stack = error.stack?.substring(0, 500);
    }

    if (error && typeof error === 'object') {
        if ('response' in error && error.response && typeof error.response === 'object') {
            const errResponse = error.response;
            if ('status' in errResponse && errResponse.status) {
                console.error('Status code da resposta do YouTube:', errResponse.status);
                errorDetails.youtube_status_code = errResponse.status;
                if (errResponse.status === 403) {
                    errorMessage = 'Acesso negado pelo YouTube (403 Forbidden). O cliente IOS pode não ter funcionado.';
                }
            }
            if ('data' in errResponse && errResponse.data) {
                console.error('Corpo da resposta do YouTube:', JSON.stringify(errResponse.data, null, 2).substring(0, 1000));
                errorDetails.youtube_response_body = JSON.stringify(errResponse.data).substring(0, 500);
            }
        } else if ('message' in error && typeof error.message === 'string' && error.message.includes('non 2xx status code')) {
            if('info' in error && error.info && typeof error.info === 'object'){
                errorDetails.info = JSON.stringify(error.info).substring(0,500);
            }
        }
    }

    res.status(statusCode).json({ error: errorMessage, details: errorDetails });
  }
});

// Verifica se está no ambiente Vercel ou local
if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
  });
} 