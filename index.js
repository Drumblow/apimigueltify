const express = require('express');
const cors = require('cors');
const YouTube = require('youtube-sr').default;
const ytdl = require('@distube/ytdl-core');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Opções comuns para ytdl, incluindo User-Agent
const ytdlOptions = {
  requestOptions: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36'
      // Poderíamos adicionar 'Accept-Language': 'en-US,en;q=0.9', etc., se necessário
    }
  }
};

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
    const searchResults = await YouTube.search(searchQuery, { limit: 10, type: 'video' });

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
    console.error('Erro na busca:', error);
    res.status(500).json({ error: 'Erro interno ao processar a busca.' });
  }
});

app.get('/audio/:videoId', async (req, res) => {
  const videoId = req.params.videoId;

  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: 'ID de vídeo inválido.' });
  }

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  console.log(`Processando áudio para: ${videoUrl} com @distube/ytdl-core`);

  try {
    // Passar ytdlOptions para getInfo
    const info = await ytdl.getInfo(videoUrl, ytdlOptions);
    // Priorizar M4A (geralmente AAC), depois WEBM (geralmente Opus)
    const audioFormat = ytdl.chooseFormat(info.formats, {
      filter: 'audioonly',
      quality: 'highestaudio',
      // Tentar obter um formato que seja explicitamente m4a ou webm
      // A biblioteca pode retornar outros, mas estes são comuns e bem suportados
      format: 'm4a'
    }) || ytdl.chooseFormat(info.formats, {
      filter: 'audioonly',
      quality: 'highestaudio',
      format: 'webm'
    }) || ytdl.chooseFormat(info.formats, { // Fallback para qualquer áudio
      filter: 'audioonly',
      quality: 'highestaudio'
    });

    if (!audioFormat) {
      console.error('Nenhum formato de áudio adequado encontrado para:', videoId);
      return res.status(404).json({ error: 'Nenhum formato de áudio adequado encontrado.' });
    }

    console.log('Formato de áudio escolhido:', {
      itag: audioFormat.itag,
      container: audioFormat.container,
      mimeType: audioFormat.mimeType,
      audioBitrate: audioFormat.audioBitrate
    });

    const safeTitle = info.videoDetails.title.replace(/[^a-zA-Z0-9_\-]/g, '') || 'audio';
    const extension = audioFormat.container || 'm4a'; // Default to m4a if container is not clear
    const filename = `${safeTitle}.${extension}`;

    res.setHeader('Content-Type', audioFormat.mimeType || 'audio/mp4'); // Default to audio/mp4
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // Se soubermos o tamanho, podemos definir Content-Length
    // if (audioFormat.contentLength) {
    //   res.setHeader('Content-Length', audioFormat.contentLength);
    // }

    // Passar ytdlOptions também para o stream de download
    const audioStream = ytdl(videoUrl, { ...ytdlOptions, format: audioFormat });

    audioStream.pipe(res);

    audioStream.on('error', (err) => {
      console.error(`Erro durante o stream de áudio (${videoId}):`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erro ao fazer o stream do áudio.' });
      }
      // Destruir o stream da resposta se o erro ocorrer no meio do stream
      if (!res.writableEnded) {
        res.destroy();
      }
    });

    audioStream.on('end', () => {
      console.log(`Stream de áudio (${videoId}) finalizado.`);
      if (!res.writableEnded) {
        res.end();
      }
    });

  } catch (error) {
    console.error(`Erro ao processar /audio/${videoId} com @distube/ytdl-core:`, error.message);
    if (error.message.includes('confirm your age') || error.message.includes('unavailable') || error.message.includes('private') ||
        error.message.includes('Sign in to confirm you\\u2019re not a bot') ||
        error.message.includes('confirm you are not a bot')) {
      return res.status(403).json({ error: 'Vídeo indisponível ou acesso negado pelo YouTube.', details: error.message });
    }
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erro interno ao obter informações do áudio.', details: error.message });
    }
  }
});

// Iniciar o servidor
// Comentado para deploy na Vercel, que lida com o servidor
/*
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
*/

module.exports = app; 