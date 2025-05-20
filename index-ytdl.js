const express = require('express');
const cors = require('cors');
const YouTube = require('youtube-sr').default;
const ytdl = require('ytdl-core');
const ffmpeg = require('ffmpeg-static');
const cp = require('child_process');

const app = express();
const port = process.env.PORT || 3000;

// Habilitar CORS para todas as origens
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

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

  if (!ytdl.validateID(videoId)) {
    return res.status(400).json({ error: 'ID de vídeo inválido.' });
  }

  try {
    console.log(`Iniciando download para o vídeo: ${videoId}`);
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    const info = await ytdl.getInfo(videoUrl, {
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      }
    });
    
    const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });

    if (!audioFormat) {
      return res.status(404).json({ error: 'Formato de áudio adequado não encontrado.' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${videoId}.mp3"`);
    
    // Aumentar o highWaterMark para evitar problemas de streaming
    const audioStream = ytdl(videoUrl, { 
      format: audioFormat,
      highWaterMark: 1 << 25, // ~32MB
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
        }
      }
    });

    const ffmpegProcess = cp.spawn(ffmpeg, [
      '-loglevel', '8', '-hide_banner',
      '-progress', 'pipe:3',
      '-i', 'pipe:4',
      '-f', 'mp3',
      '-movflags', 'frag_keyframe+empty_moov',
      'pipe:5'
    ], {
      windowsHide: true,
      stdio: [
        /* Standard: stdin, stdout, stderr */
        'inherit', 'inherit', 'inherit',
        /* Custom: pipe:3, pipe:4, pipe:5 */
        'pipe', 'pipe', 'pipe'
      ],
    });

    audioStream.pipe(ffmpegProcess.stdio[4]);
    ffmpegProcess.stdio[5].pipe(res);

    ffmpegProcess.on('error', (err) => {
      console.error('Erro no FFMPEG:', err);
      if (!res.headersSent) {
        res.status(500).send('Erro ao converter o áudio.');
      }
      // Destruir streams para evitar vazamentos de memória
      audioStream.destroy();
      if (ffmpegProcess.stdio[5] && typeof ffmpegProcess.stdio[5].destroy === 'function') {
        ffmpegProcess.stdio[5].destroy();
      }
    });

    res.on('close', () => {
      // Garante que o processo ffmpeg seja encerrado se o cliente fechar a conexão
      if (ffmpegProcess) {
        ffmpegProcess.kill();
      }
      
      audioStream.destroy();
      
      if (ffmpegProcess.stdio[5] && typeof ffmpegProcess.stdio[5].destroy === 'function') {
        ffmpegProcess.stdio[5].destroy();
      }
      
      console.log(`Cliente fechou a conexão para o vídeo ${videoId}`);
    });
    
  } catch (error) {
    console.error('Erro ao processar o áudio:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erro interno ao processar o áudio.', details: error.message });
    }
  }
});

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

module.exports = app; 