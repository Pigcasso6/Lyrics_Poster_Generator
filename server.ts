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
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).send('Missing image url');
    }
    try {
      let targetUrl = imageUrl;
      if (targetUrl.startsWith('http://')) {
        targetUrl = targetUrl.replace('http://', 'https://');
      }

      const isQQ = targetUrl.includes('qq.com') || targetUrl.includes('gtimg.cn');
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Referer': isQQ ? 'https://y.qq.com/' : 'https://music.163.com/',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        // Return placeholder svg instead of breaking
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><rect width="500" height="500" fill="#0f172a"/><circle cx="250" cy="250" r="180" fill="#1e293b"/><circle cx="250" cy="250" r="90" fill="#0284c7"/><circle cx="250" cy="250" r="24" fill="#0f172a"/></svg>`;
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        return res.send(svg);
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
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><rect width="500" height="500" fill="#0f172a"/><circle cx="250" cy="250" r="180" fill="#1e293b"/><circle cx="250" cy="250" r="90" fill="#0284c7"/><circle cx="250" cy="250" r="24" fill="#0f172a"/></svg>`;
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.send(svg);
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
