const express = require('express');
const cors = require('cors');
const YouTube = require('youtube-sr').default;
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const youtubedl = require('youtube-dl-exec');
const ffmpeg = require('ffmpeg-static');

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
    const searchResults = await YouTube.search(searchQuery, { limit: 5, type: 'video' });

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

  if (!videoId) {
    return res.status(400).json({ error: 'O ID do vídeo é obrigatório.' });
  }

  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: 'ID de vídeo inválido.' });
  }

  console.log(`Processando vídeo com youtube-dl: ${videoId}`);
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const audioBuffer = await youtubedl(videoUrl, {
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: '0',
      ffmpegLocation: ffmpeg,
      output: '-', // Retorna o buffer via stdout/Promise
      addHeader: [
        'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language:en-US,en;q=0.9'
      ],
    });

    // O resultado de youtubedl com output: '-' é o buffer do áudio
    // stdout e stderr da promise são para logs, não para o stream de dados principal aqui
    // if (audio.stdout) { // Esta verificação não é mais necessária da mesma forma

    if (audioBuffer) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${videoId}.mp3"`);
      res.send(audioBuffer);
    } else {
      // Isso não deveria acontecer se a promise resolveu sem erro e output é '-'
      console.error(`youtube-dl não retornou buffer para ${videoId}, embora não tenha lançado erro.`);
      if (!res.headersSent) {
          res.status(500).json({ error: 'Falha ao obter o buffer de áudio.' });
      }
    }

  } catch (error) {
    // O erro de youtube-dl-exec já inclui stderr se houver
    console.error(`Erro ao processar /audio/${videoId} com youtube-dl:`, error.message);
    console.error('Stderr (se disponível):', error.stderr);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erro interno ao processar o áudio com youtube-dl.', details: error.stderr || error.message });
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