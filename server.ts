import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { searchNetease, searchQQ, getNeteaseDetail, getQQDetail } from './server/musicService';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Global CORS Middleware to allow cross-origin API calls on custom domains
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json());

  // Search API (aggregates NetEase and QQ Music)
  app.get('/api/music/search', async (req, res) => {
    const keyword = (req.query.keyword as string || '').trim();
    if (!keyword) {
      return res.json({ keyword: '', netease: [], qq: [], total: 0 });
    }

    try {
      const [neteaseRes, qqRes] = await Promise.allSettled([
        searchNetease(keyword),
        searchQQ(keyword),
      ]);

      const netease = neteaseRes.status === 'fulfilled' ? neteaseRes.value : [];
      const qq = qqRes.status === 'fulfilled' ? qqRes.value : [];

      res.json({
        keyword,
        netease,
        qq,
        total: netease.length + qq.length,
      });
    } catch (err: any) {
      console.error('Error during search aggregation:', err);
      res.status(500).json({ error: 'Search failed', message: err.message });
    }
  });

  // Song Detail & Lyric API
  app.get('/api/music/lyrics', async (req, res) => {
    const platform = (req.query.platform as string) || 'netease';
    const id = (req.query.id as string) || '';
    const songMid = req.query.songMid as string;
    const name = (req.query.name as string) || '歌曲';
    const artist = (req.query.artist as string) || '';
    const album = (req.query.album as string) || '';
    const albumCover = (req.query.albumCover as string) || '';
    const duration = Number(req.query.duration) || 240;

    try {
      let lyricData;
      if (platform === 'qq') {
        lyricData = await getQQDetail(id, songMid, name, artist);
      } else {
        lyricData = await getNeteaseDetail(id, name, req.query.lrcUrl as string);
      }

      res.json({
        song: {
          id,
          songMid,
          platform,
          name,
          artist,
          album,
          albumCover: lyricData.albumCover || albumCover,
          duration,
        },
        rawLyric: lyricData.rawLyric,
        rawTLyric: lyricData.rawTLyric,
        lyrics: lyricData.lyrics,
        hasLyric: lyricData.lyrics.length > 0,
      });
    } catch (err: any) {
      console.error('Error fetching lyrics:', err);
      res.status(500).json({ error: 'Failed to fetch lyrics', message: err.message });
    }
  });

  // Hot Search Keywords
  app.get('/api/music/hot', (req, res) => {
    res.json({
      tags: ['晴天', '七里香', '孤勇者', '光辉岁月', '漠河舞厅', '乌梅子酱', '青花瓷', '如愿', '稻香'],
    });
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Image Proxy to avoid CORS taint during poster generation & downloads
  app.get('/api/music/proxy-image', async (req, res) => {
    let targetUrl = '';
    const rawOriginalUrl = req.originalUrl || '';
    const urlIdx = rawOriginalUrl.indexOf('url=');
    if (urlIdx !== -1) {
      targetUrl = rawOriginalUrl.substring(urlIdx + 4);
      // Remove any trailing parameters that might be appended by html-to-image cacheBust
      const ampIdx = targetUrl.lastIndexOf('&t=');
      if (ampIdx !== -1) {
        targetUrl = targetUrl.substring(0, ampIdx);
      }
      try {
        targetUrl = decodeURIComponent(targetUrl);
      } catch (e) {}
    } else {
      targetUrl = req.query.url as string;
    }

    if (!targetUrl) {
      return res.status(400).send('Missing image url');
    }

    try {
      if (targetUrl.startsWith('http://')) {
        targetUrl = targetUrl.replace('http://', 'https://');
      }

      const isQQ = targetUrl.includes('qq.com') || targetUrl.includes('gtimg.cn') || targetUrl.includes('qpic.cn');
      const isMeting = targetUrl.includes('i-meto.com');
      const isNetease = targetUrl.includes('126.net') || targetUrl.includes('163.com');

      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      };

      if (isQQ) {
        headers['Referer'] = 'https://y.qq.com/';
      } else if (isMeting) {
        headers['Referer'] = 'https://i-meto.com/';
      } else if (isNetease) {
        headers['Referer'] = 'https://music.163.com/';
      }

      let response = await fetch(targetUrl, { headers });

      if (!response.ok && targetUrl.startsWith('https://')) {
        const httpUrl = targetUrl.replace('https://', 'http://');
        try {
          const res2 = await fetch(httpUrl, { headers });
          if (res2.ok) {
            response = res2;
          }
        } catch (e) {}
      }

      if (!response.ok) {
        console.error(`Proxy fetch failed (${response.status}) for URL: ${targetUrl}`);
        return res.status(response.status).send('Image fetch failed');
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const arrayBuf = await response.arrayBuffer();

      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(Buffer.from(arrayBuf));
    } catch (err: any) {
      console.error('Image proxy error:', err);
      res.status(500).send('Proxy error');
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
