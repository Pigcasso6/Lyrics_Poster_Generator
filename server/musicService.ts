import { Song, LyricLine } from '../src/types';

// Random Chinese IP pool to bypass overseas VPS datacenter geo-blocking
const CHINESE_IPS = [
  '118.89.204.198',
  '117.136.8.134',
  '223.252.199.66',
  '123.125.114.144',
  '183.232.231.172',
  '220.181.38.148',
  '120.232.145.185',
  '36.110.213.205',
];

function getRandomChineseIP(): string {
  return CHINESE_IPS[Math.floor(Math.random() * CHINESE_IPS.length)];
}

function getCommonHeaders(referer: string): Record<string, string> {
  const ip = getRandomChineseIP();
  return {
    'Referer': referer,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'X-Real-IP': ip,
    'X-Forwarded-For': `${ip}, ${getRandomChineseIP()}`,
    'Client-IP': ip,
    'X-Client-IP': ip,
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  };
}
function cleanArtist(name: string): string {
  if (!name) return '';
  let cleaned = name
    .replace(/\s*[（(][^）)]*[ぁ-んァ-ヶー][^）)]*[）)]/g, '')
    .replace(/\s*[（(][^）)]*[\uac00-\ud7af][^）)]*[）)]/g, '')
    .replace(/\s*[（(][^）)]*[\u4e00-\u9fa5]+[^）)]*[）)]/g, '')
    .trim();

  if (/[\u4e00-\u9fa5ぁ-んァ-ヶ]/.test(cleaned)) {
    cleaned = cleaned.replace(/\s*[（(][a-zA-Z\s.,'\-&]+[）)]/g, '').trim();
  }
  return cleaned || name.trim();
}

// Helper to decode HTML entities in lyrics (like &#58; &#10; &apos;)
function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

// Parse standard LRC format into structured lines with precise translation matching
export function parseLrc(lrcText: string, tlyricText?: string): LyricLine[] {
  if (!lrcText) return [];

  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;
  const lines = lrcText.split('\n');
  const parsedMap = new Map<number, { text: string; translation?: string; isMeta: boolean }>();
  const nonTimedLines: string[] = [];

  // Parse original lyrics
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Filter out meta tags like [ti: ...], [ar: ...]
    if (/^\[(ti|ar|al|by|offset|kana):/i.test(trimmed)) {
      continue;
    }

    // Collect all timestamps on this line
    const matches = [...trimmed.matchAll(timeRegex)];
    const text = trimmed.replace(timeRegex, '').trim();

    if (matches.length > 0) {
      if (text) {
        const isMeta = /^(作词|作曲|编曲|制作人|监制|混音|母带|吉他|贝斯|鼓|键盘|和声|录音|发行|出品|词|曲|arranger|producer|lyricist|composer)\s*[:：]/i.test(text);
        for (const match of matches) {
          const minutes = parseInt(match[1], 10);
          const seconds = parseInt(match[2], 10);
          const millis = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
          const totalSeconds = Math.round((minutes * 60 + seconds + millis / 1000) * 100) / 100;
          parsedMap.set(totalSeconds, { text, isMeta });
        }
      }
    } else if (trimmed) {
      nonTimedLines.push(trimmed);
    }
  }

  // Parse translation lyrics if present
  if (tlyricText) {
    const tlines = tlyricText.split('\n');
    for (const line of tlines) {
      const trimmed = line.trim();
      if (!trimmed || /^\[(ti|ar|al|by):/i.test(trimmed)) continue;
      const matches = [...trimmed.matchAll(timeRegex)];
      let transText = trimmed.replace(timeRegex, '').trim();

      // QQ Music blank translation lines often use '//'
      if (transText === '//' || transText === '/') {
        transText = '';
      }

      if (matches.length > 0 && transText) {
        for (const match of matches) {
          const minutes = parseInt(match[1], 10);
          const seconds = parseInt(match[2], 10);
          const millis = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
          const totalSeconds = Math.round((minutes * 60 + seconds + millis / 1000) * 100) / 100;

          // Find the key with MINIMUM distance (prioritizing non-metadata lines)
          let bestKey: number | null = null;
          let minDiff = Infinity;

          for (const [key, val] of parsedMap.entries()) {
            const diff = Math.abs(key - totalSeconds);
            // If the line is pure metadata (like 词：/曲：) and diff isn't nearly 0, penalize it
            const adjustedDiff = val.isMeta ? diff + 0.6 : diff;
            if (adjustedDiff < minDiff) {
              minDiff = adjustedDiff;
              bestKey = key;
            }
          }

          if (bestKey !== null && minDiff <= 0.4) {
            const current = parsedMap.get(bestKey)!;
            current.translation = transText;
          }
        }
      }
    }
  }

  let result: LyricLine[] = Array.from(parsedMap.entries())
    .map(([time, val], idx) => ({
      id: `line-${time}-${idx}`,
      time,
      text: val.text,
      translation: val.translation,
    }))
    .sort((a, b) => (a.time || 0) - (b.time || 0));

  if (result.length === 0 && nonTimedLines.length > 0) {
    result = nonTimedLines.map((text, idx) => ({
      id: `plain-${idx}`,
      text,
    }));
  }

  return result;
}

// Built-in curated popular songs dictionary for high reliability & instant preview
const POPULAR_SONG_DB: Array<{
  keyword: string;
  name: string;
  artist: string;
  album: string;
  duration: number;
  releaseDate: string;
  neteaseCover: string;
  qqCover: string;
  lrc: string;
  tlyric?: string;
  audioPreview?: string;
}> = [
  {
    keyword: '晴天',
    name: '晴天',
    artist: '周杰伦',
    album: '叶惠美',
    duration: 269,
    releaseDate: '2003-07-31',
    neteaseCover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    qqCover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    audioPreview: 'https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg',
    lrc: `[00:00.00]晴天 - 周杰伦
[00:04.00]词：周杰伦 曲：周杰伦
[00:28.00]故事的小黄花 从出生那年就飘着
[00:34.00]童年的荡秋千 随记忆一直晃到现在
[00:41.00]Re So So Si Do Si La
[00:44.00]So La Si Si Si Si La Si La So
[00:48.00]吹着前奏 望着天空 我想起了花瓣试着掉落
[00:55.00]为你翘课的那一天 花落的那一天
[00:58.00]教室的那一间 我怎么看不见
[01:02.00]消失的下雨天 我好想再淋一遍
[01:08.00]没想到失去的勇气我还留着
[01:14.00]好想再问一遍 你会等待还是离开
[01:21.00]刮风这天 我试过握着你手
[01:28.00]但偏偏 雨渐渐 大到我看你不见
[01:35.00]还要多久 我才能在你身边
[01:42.00]等待放晴的那天 也许我会比较好一点
[01:49.00]从前从前 有个人爱你很久
[01:56.00]但偏偏 风渐渐 把距离吹得好远
[02:03.00]好不容易 又能再多爱一天
[02:10.00]但故事的最后 你好像还是说了拜拜`,
  },
  {
    keyword: '七里香',
    name: '七里香',
    artist: '周杰伦',
    album: '七里香',
    duration: 299,
    releaseDate: '2004-08-03',
    neteaseCover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    qqCover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
    lrc: `[00:00.00]七里香 - 周杰伦
[00:03.00]词：方文山 曲：周杰伦
[00:24.00]窗外的麻雀 在电线杆上多嘴
[00:29.00]你说这一句 很有夏天的感觉
[00:35.00]手中的铅笔 在纸上来来回回
[00:41.00]我用几行字形容你是我的谁
[00:47.00]秋刀鱼的滋味 猫跟你都想了解
[00:53.00]初恋的香味就这样被我们寻回
[00:58.00]那温暖的阳光 像刚摘的鲜艳草莓
[01:04.00]你说你舍不得吃掉这一种感觉
[01:10.00]雨下整夜 我的爱溢出就像雨水
[01:16.00]院子落叶 跟我的思念厚厚一叠
[01:22.00]几句是非 也无法将我的热情冷却
[01:27.00]你出现在我诗的每一页
[01:33.00]雨下整夜 我的爱溢出就像雨水
[01:39.00]窗台蝴蝶 像诗里纷飞的美丽章节
[01:45.00]我接着写 把永远爱你写进诗的结尾
[01:51.00]你是我唯一想要的了解`,
  },
  {
    keyword: '孤勇者',
    name: '孤勇者',
    artist: '陈奕迅',
    album: '孤勇者',
    duration: 256,
    releaseDate: '2021-11-08',
    neteaseCover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&auto=format&fit=crop&q=80',
    qqCover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80',
    lrc: `[00:00.00]孤勇者 - 陈奕迅
[00:03.00]《英雄联盟：双城之战》动画中文主题曲
[00:06.00]词：唐恬 曲：钱雷
[00:19.00]都是勇敢的
[00:23.00]你额头的伤口 你的 不同 你犯的错
[00:30.00]都不必隐藏
[00:34.00]你破旧的玩偶 你的 面具 你的自我
[00:41.00]他们说 要带着光 驯服每一头怪兽
[00:47.00]他们说 要缝好你的伤 没有人爱小丑
[00:52.00]为何孤独 不可 光荣
[00:55.00]人只有不完美 值得歌颂
[00:58.00]谁说污泥满身的不算英雄
[01:04.00]爱你孤身走暗巷 爱你不跪的模样
[01:09.00]爱你对峙过绝望 不肯哭一场
[01:15.00]爱你破烂的衣裳 却敢堵命运的枪
[01:21.00]爱你和我那么像 缺口都一样
[01:27.00]去吗 配吗 这褴褛的披风
[01:32.00]战吗 战啊 以最卑微的梦
[01:38.00]致那黑夜中的呜咽与怒吼
[01:44.00]谁说站在光里的才算英雄`,
  },
  {
    keyword: '光辉岁月',
    name: '光辉岁月',
    artist: 'Beyond',
    album: '命运派对',
    duration: 302,
    releaseDate: '1990-09-01',
    neteaseCover: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&auto=format&fit=crop&q=80',
    qqCover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    lrc: `[00:00.00]光辉岁月 - Beyond
[00:03.00]词：黄家驹 曲：黄家驹
[00:30.00]钟声提及了回家 讯息在漫长路
[00:36.00]残留躯体 烙印着痛
[00:42.00]黑色肌肤给他的意义 是一生奉献
[00:48.00]肤色斗争中
[00:54.00]年月把拥有变做失去
[01:00.00]疲倦的双眼带着期望
[01:06.00]今天只有残留的躯壳
[01:12.00]迎接光辉岁月
[01:15.00]风雨中抱紧自由
[01:21.00]一生经过傍徨的挣扎
[01:27.00]自信可改变未来
[01:30.00]问谁又能做到`,
  },
  {
    keyword: '乌梅子酱',
    name: '乌梅子酱',
    artist: '李荣浩',
    album: '纵横四海',
    duration: 219,
    releaseDate: '2022-12-21',
    neteaseCover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80',
    qqCover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    lrc: `[00:00.00]乌梅子酱 - 李荣浩
[00:03.00]词：李荣浩 曲：李荣浩
[00:16.00]背靠在树枝上 听风吹过声响
[00:22.00]阳光穿透叶缝落在你脸庞
[00:30.00]你浅浅的微笑 就像乌梅子酱
[00:37.00]我尝了你嘴角唇膏 薄荷味道
[00:44.00]是甜甜的爱情 来的这么确定
[00:51.00]因为你每个眼神我都着迷
[00:59.00]你浅浅的微笑 就像乌梅子酱
[01:06.00]迎风吹过你的头发 散发清香`,
  },
  {
    keyword: '爱如火',
    name: '爱如火',
    artist: '卫兰 / 那艺娜',
    album: '热门单曲',
    duration: 188,
    releaseDate: '2023-01-10',
    neteaseCover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
    qqCover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    lrc: `[00:00.00]爱如火
[00:04.00]心在跳 是爱情如烈火
[00:08.00]你在笑 疯狂的人是我
[00:12.00]爱如火 会温暖了心窝
[00:16.00]我看见 爱的光芒闪烁
[00:20.00]心在跳 是爱情如烈火
[00:24.00]你在笑 疯狂的人是我
[00:28.00]爱如火 会温暖了心窝
[00:32.00]我看见 爱的光芒闪烁`,
  },
  {
    keyword: '漠河舞厅',
    name: '漠河舞厅',
    artist: '柳爽',
    album: '1st.星球',
    duration: 278,
    releaseDate: '2020-06-15',
    neteaseCover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    qqCover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&auto=format&fit=crop&q=80',
    lrc: `[00:00.00]漠河舞厅 - 柳爽
[00:03.00]词：柳爽 曲：柳爽
[00:22.00]我从没有见过极光出现的村落
[00:30.00]也没有见过有人 在深夜放烟火
[00:38.00]晚星就像你的眼睛 杀人又放火
[00:46.00]你什么都不必说 野风惊扰我
[00:54.00]如果时间真能倒流 哪怕一秒钟
[01:02.00]我也想在雪地里 紧紧拥抱你
[01:10.00]你跳着舞 旋转在月光下
[01:18.00]这一曲终了 谁能再记起我`,
  }
];

// NetEase Cloud Music Search (with multiple endpoint fallbacks & geo-spoofing)
export async function searchNetease(keyword: string): Promise<Song[]> {
  const commonHeaders = getCommonHeaders('https://music.163.com/');
  const songs: Song[] = [];

  // Strategy 1: Real NetEase cloudsearch/pc API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const url = `https://music.163.com/api/cloudsearch/pc?s=${encodeURIComponent(keyword)}&type=1&offset=0&limit=30`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        ...commonHeaders,
        'Cookie': 'os=pc; osver=Microsoft-Windows-10-Professional-build-19042-64bit; appver=2.9.7; NMTID=00O' + Math.random().toString(36).substring(2),
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const songList = data?.result?.songs;
      if (Array.isArray(songList) && songList.length > 0) {
        for (const s of songList) {
          const rawArtistName =
            s.ar?.map((a: any) => a.name).join('/') ||
            s.artists?.map((a: any) => a.name).join('/') ||
            '未知歌手';
          const artistName = cleanArtist(rawArtistName);
          const albumName = s.al?.name || s.album?.name || '单曲';
          let albumPic = s.al?.picUrl || s.album?.picUrl || '';
          if (albumPic) {
            albumPic = albumPic.replace('http:', 'https:');
            if (!albumPic.includes('?param=')) {
              albumPic += '?param=500y500';
            }
          } else {
            albumPic = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';
          }

          songs.push({
            id: String(s.id),
            platform: 'netease',
            name: s.name || keyword,
            artist: artistName,
            album: albumName,
            albumCover: albumPic,
            duration: Math.round((s.dt || s.duration || 210000) / 1000),
            url: `https://music.163.com/#/song?id=${s.id}`,
          });
        }
        return songs;
      }
    }
  } catch (err) {
    console.warn('NetEase cloudsearch error:', err);
  }

  // Strategy 2: NetEase iOS API (frequently unblocked on overseas VPS)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const url = `https://music.163.com/api/search/get?s=${encodeURIComponent(keyword)}&type=1&offset=0&limit=30`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        ...commonHeaders,
        'User-Agent': 'NeteaseMusic/8.9.70 (iPhone; iOS 16.0; zh_CN)',
        'Cookie': 'os=ios; appver=8.9.70; osver=16.0; channel=appstore;',
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const songList = data?.result?.songs;
      if (Array.isArray(songList) && songList.length > 0) {
        for (const s of songList) {
          const rawArtistName = s.artists?.map((a: any) => a.name).join('/') || '未知歌手';
          const artistName = cleanArtist(rawArtistName);
          const albumName = s.album?.name || '单曲';
          let albumPic = s.album?.picUrl || '';
          if (albumPic) {
            albumPic = albumPic.replace('http:', 'https:');
            if (!albumPic.includes('?param=')) {
              albumPic += '?param=500y500';
            }
          } else {
            albumPic = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';
          }

          songs.push({
            id: String(s.id),
            platform: 'netease',
            name: s.name || keyword,
            artist: artistName,
            album: albumName,
            albumCover: albumPic,
            duration: Math.round((s.duration || 210000) / 1000),
            url: `https://music.163.com/#/song?id=${s.id}`,
          });
        }
        return songs;
      }
    }
  } catch (err) {
    console.warn('NetEase iOS search error:', err);
  }

  // Strategy 3: NetEase search/get/web fallback
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const url = `https://music.163.com/api/search/get/web?s=${encodeURIComponent(keyword)}&type=1&offset=0&limit=30&total=true`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        ...commonHeaders,
        'Cookie': 'os=pc; appver=2.9.7;',
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const songList = data?.result?.songs;
      if (Array.isArray(songList) && songList.length > 0) {
        for (const s of songList) {
          const rawArtistName = s.artists?.map((a: any) => a.name).join('/') || '未知歌手';
          const artistName = cleanArtist(rawArtistName);
          const albumName = s.album?.name || '单曲';
          let albumPic = s.album?.picUrl || '';
          if (albumPic) {
            albumPic = albumPic.replace('http:', 'https:');
            if (!albumPic.includes('?param=')) {
              albumPic += '?param=500y500';
            }
          } else {
            albumPic = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';
          }

          songs.push({
            id: String(s.id),
            platform: 'netease',
            name: s.name || keyword,
            artist: artistName,
            album: albumName,
            albumCover: albumPic,
            duration: Math.round((s.duration || 210000) / 1000),
            url: `https://music.163.com/#/song?id=${s.id}`,
          });
        }
        return songs;
      }
    }
  } catch (err) {
    console.warn('NetEase search/get/web error:', err);
  }

  // Strategy 4: High-speed Meting mirror failover
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const metingUrl = `https://api.i-meto.com/meting/api?server=netease&type=search&id=${encodeURIComponent(keyword)}`;
    const res = await fetch(metingUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        for (let i = 0; i < list.length; i++) {
          const item = list[i];
          const realId = (item.lrc && item.lrc.match(/id=(\d+)/)?.[1]) || (item.url && item.url.match(/id=(\d+)/)?.[1]) || String(item.id || i);
          songs.push({
            id: realId,
            platform: 'netease',
            name: item.title || keyword,
            artist: cleanArtist(item.author || '未知歌手'),
            album: item.title || '单曲',
            albumCover: item.pic || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
            duration: 240,
            url: item.url || `https://music.163.com/#/song?id=${realId}`,
            lrcUrl: item.lrc,
          });
        }
        return songs;
      }
    }
  } catch (e) {
    console.warn('NetEase Meting search mirror error:', e);
  }

  // Strategy 5: GDStudio mirror failover
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const gdUrl = `https://music-api.gdstudio.xyz/api.php?types=search&count=25&source=netease&name=${encodeURIComponent(keyword)}`;
    const res = await fetch(gdUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        for (const item of list) {
          const artistName = Array.isArray(item.artist) ? item.artist.join('/') : (item.artist || '未知歌手');
          songs.push({
            id: String(item.id || item.url_id),
            platform: 'netease',
            name: item.name || keyword,
            artist: cleanArtist(artistName),
            album: item.album || '单曲',
            albumCover: item.pic_id
              ? `https://p1.music.126.net/${item.pic_id}.jpg?param=500y500`
              : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
            duration: 240,
            url: `https://music.163.com/#/song?id=${item.id}`,
          });
        }
        return songs;
      }
    }
  } catch (e) {
    console.warn('NetEase GDStudio search error:', e);
  }

  // Strategy 6: Check static library
  const kw = keyword.toLowerCase().trim();
  const matched = POPULAR_SONG_DB.filter(
    (s) =>
      s.keyword.toLowerCase().includes(kw) ||
      s.name.toLowerCase().includes(kw) ||
      s.artist.toLowerCase().includes(kw)
  );

  return matched.map((item, idx) => ({
    id: `netease_${idx + 1}`,
    platform: 'netease' as const,
    name: item.name,
    artist: item.artist,
    album: item.album,
    albumCover: item.neteaseCover,
    duration: item.duration,
    releaseDate: item.releaseDate,
    url: `https://music.163.com`,
  }));
}

// QQ Music Search (with multiple endpoint fallbacks & geo-spoofing)
export async function searchQQ(keyword: string): Promise<Song[]> {
  const commonHeaders = getCommonHeaders('https://y.qq.com/');
  const songs: Song[] = [];

  // Strategy 1: QQ Music client_search_cp API (JSON format)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const url = `https://c.y.qq.com/soso/fcgi-bin/client_search_cp?p=1&n=30&w=${encodeURIComponent(keyword)}&format=json&t=0&cr=1`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: commonHeaders,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const songList = data?.data?.song?.list;
      if (Array.isArray(songList) && songList.length > 0) {
        for (const s of songList) {
          const rawArtistName = s.singer?.map((sg: any) => sg.name).join('/') || '未知歌手';
          const artistName = cleanArtist(rawArtistName);
          const albumName = s.albumname || '单曲';
          const albumMid = s.albummid || '';
          const albumPic = albumMid
            ? `https://y.gtimg.cn/music/photo_new/T002R500x500M000${albumMid}.jpg`
            : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80';

          songs.push({
            id: String(s.songid || s.songmid),
            songMid: s.songmid,
            albumMid: s.albummid,
            platform: 'qq',
            name: s.songname || keyword,
            artist: artistName,
            album: albumName,
            albumCover: albumPic,
            duration: s.interval || 220,
            url: `https://y.qq.com/n/ryqq/songDetail/${s.songmid || s.songid}`,
          });
        }
        return songs;
      }
    }
  } catch (err) {
    console.warn('QQ Music JSON search error:', err);
  }

  // Strategy 2: QQ Music client_search_cp API (JSONP format parsing)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const url = `https://c.y.qq.com/soso/fcgi-bin/client_search_cp?p=1&n=30&w=${encodeURIComponent(keyword)}&format=jsonp&jsonpCallback=callback&t=0`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: commonHeaders,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const text = await res.text();
      const match = text.match(/^callback\((.*)\)$/s) || text.match(/\((.*)\)/s);
      if (match) {
        const data = JSON.parse(match[1]);
        const songList = data?.data?.song?.list;
        if (Array.isArray(songList) && songList.length > 0) {
          for (const s of songList) {
            const rawArtistName = s.singer?.map((sg: any) => sg.name).join('/') || '未知歌手';
            const artistName = cleanArtist(rawArtistName);
            const albumName = s.albumname || '单曲';
            const albumMid = s.albummid || '';
            const albumPic = albumMid
              ? `https://y.gtimg.cn/music/photo_new/T002R500x500M000${albumMid}.jpg`
              : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80';

            songs.push({
              id: String(s.songid || s.songmid),
              songMid: s.songmid,
              albumMid: s.albummid,
              platform: 'qq',
              name: s.songname || keyword,
              artist: artistName,
              album: albumName,
              albumCover: albumPic,
              duration: s.interval || 220,
              url: `https://y.qq.com/n/ryqq/songDetail/${s.songmid || s.songid}`,
            });
          }
          return songs;
        }
      }
    }
  } catch (err) {
    console.warn('QQ Music JSONP search error:', err);
  }

  // Strategy 3: QQ Smartbox Search
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const url = `https://c.y.qq.com/splcloud/fcgi-bin/smartbox_new.fcg?key=${encodeURIComponent(keyword)}&format=json`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: commonHeaders,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const songItems = data?.data?.song?.itemlist;
      if (Array.isArray(songItems) && songItems.length > 0) {
        for (const s of songItems) {
          songs.push({
            id: String(s.id || s.mid),
            songMid: s.mid,
            platform: 'qq',
            name: s.name || keyword,
            artist: cleanArtist(s.singer || '未知歌手'),
            album: '精选单曲',
            albumCover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
            duration: 240,
            url: `https://y.qq.com/n/ryqq/songDetail/${s.mid || s.id}`,
          });
        }
        return songs;
      }
    }
  } catch (err) {
    console.warn('QQ Smartbox search error:', err);
  }

  // Strategy 4: Check static library
  const kw = keyword.toLowerCase().trim();
  const matched = POPULAR_SONG_DB.filter(
    (s) =>
      s.keyword.toLowerCase().includes(kw) ||
      s.name.toLowerCase().includes(kw) ||
      s.artist.toLowerCase().includes(kw)
  );

  return matched.map((item, idx) => ({
    id: `qq_${idx + 1}`,
    songMid: `mid_${idx}`,
    platform: 'qq' as const,
    name: item.name,
    artist: item.artist,
    album: item.album,
    albumCover: item.qqCover,
    duration: item.duration,
    releaseDate: item.releaseDate,
    url: `https://y.qq.com`,
  }));
}

// Fetch NetEase Song Lyrics & Details
export async function getNeteaseDetail(id: string, songName?: string, lrcUrl?: string): Promise<{ lyrics: LyricLine[]; rawLyric: string; rawTLyric?: string; albumCover?: string }> {
  let rawLyric = '';
  let rawTLyric = '';
  let albumCover = '';
  const commonHeaders = getCommonHeaders('https://music.163.com/');

  // Strategy 0: If direct authenticated lrcUrl is passed, fetch it first
  if (lrcUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(lrcUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const text = await res.text();
        if (text && text.includes('[') && !text.includes('鉴权失败') && !text.includes('非法调用')) {
          rawLyric = text;
        }
      }
    } catch (e) {}
  }

  // Strategy 1: Real NetEase lyric & detail APIs
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const [lyricRes, detailRes] = await Promise.allSettled([
      fetch(`https://music.163.com/api/song/lyric?os=pc&id=${id}&lv=-1&kv=-1&tv=-1`, {
        signal: controller.signal,
        headers: {
          ...commonHeaders,
          'Cookie': 'os=pc; appver=2.9.7;',
        },
      }),
      fetch(`https://music.163.com/api/song/detail/?id=${id}&ids=[${id}]`, {
        signal: controller.signal,
        headers: commonHeaders,
      }),
    ]);

    clearTimeout(timeoutId);

    if (!rawLyric && lyricRes.status === 'fulfilled' && lyricRes.value.ok) {
      const data = await lyricRes.value.json();
      rawLyric = data?.lrc?.lyric || '';
      rawTLyric = data?.tlyric?.lyric || '';
    }

    if (detailRes.status === 'fulfilled' && detailRes.value.ok) {
      const data = await detailRes.value.json();
      if (data?.songs?.[0]?.album?.picUrl) {
        albumCover = data.songs[0].album.picUrl.replace('http:', 'https:');
      }
    }
  } catch (err) {
    console.warn('NetEase lyric fetch failed:', err);
  }

  // Strategy 2: Fallback to OSX lyric endpoint if lyric still empty
  if (!rawLyric) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`https://music.163.com/api/song/lyric?os=osx&id=${id}&lv=-1&kv=-1&tv=-1`, {
        signal: controller.signal,
        headers: {
          ...commonHeaders,
          'Cookie': 'os=osx;',
        },
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        rawLyric = data?.lrc?.lyric || '';
        rawTLyric = data?.tlyric?.lyric || '';
      }
    } catch (e) {}
  }

  // Strategy 3: Meting search & lyric mirror fallback by song ID / name
  if (!rawLyric) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const searchKw = songName || id;
      const res = await fetch(`https://api.i-meto.com/meting/api?server=netease&type=search&id=${encodeURIComponent(searchKw)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          const matched = list.find((it: any) => String(it.id) === String(id) || (it.lrc && it.lrc.includes(`id=${id}`))) || list[0];
          if (matched?.lrc) {
            const lRes = await fetch(matched.lrc);
            if (lRes.ok) {
              const lText = await lRes.text();
              if (lText && lText.includes('[') && !lText.includes('鉴权失败')) {
                rawLyric = lText;
              }
            }
          }
          if (!albumCover && matched?.pic) {
            albumCover = matched.pic;
          }
        }
      }
    } catch (e) {}
  }

  // Strategy 4: If no rawLyric returned from API, check our smart library
  if (!rawLyric) {
    const fallback = findFallbackByIdOrKeyword(songName || id);
    if (fallback) {
      rawLyric = fallback.lrc;
      rawTLyric = fallback.tlyric || '';
      if (!albumCover) albumCover = fallback.neteaseCover;
    }
  }

  const parsed = parseLrc(rawLyric, rawTLyric);
  return { lyrics: parsed, rawLyric, rawTLyric, albumCover };
}

// Fetch QQ Music Song Lyrics & Details
export async function getQQDetail(id: string, songMid?: string): Promise<{ lyrics: LyricLine[]; rawLyric: string; rawTLyric?: string; albumCover?: string }> {
  let rawLyric = '';
  let rawTLyric = '';
  let albumCover = '';
  const targetMid = songMid || id;
  const commonHeaders = getCommonHeaders('https://y.qq.com/');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    // Primary: QQ Music modern musicu.fcg API with built-in translation lyrics
    const postData = {
      comm: { ct: 24, cv: 0 },
      lyric: {
        module: 'music.musichallSong.PlayLyricInfo',
        method: 'GetPlayLyricInfo',
        param: {
          songMID: targetMid,
          songID: isNaN(Number(id)) ? 0 : Number(id),
          trans: 1,
          roma: 1,
        },
      },
    };

    const musicuRes = await fetch('https://u.y.qq.com/cgi-bin/musicu.fcg', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        ...commonHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    });

    clearTimeout(timeoutId);

    if (musicuRes.ok) {
      const data = await musicuRes.json();
      const lyricData = data?.lyric?.data;
      if (lyricData) {
        if (lyricData.lyric) {
          try {
            rawLyric = Buffer.from(lyricData.lyric, 'base64').toString('utf-8');
          } catch {
            rawLyric = lyricData.lyric;
          }
        }
        if (lyricData.trans) {
          try {
            rawTLyric = Buffer.from(lyricData.trans, 'base64').toString('utf-8');
          } catch {
            rawTLyric = lyricData.trans;
          }
        }
      }
    }
  } catch (err) {
    console.warn('QQ musicu lyric fetch failed:', err);
  }

  // Fallback to legacy fcg_query_lyric_new if rawLyric still empty
  if (!rawLyric) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const lyricRes = await fetch(
        `https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid=${encodeURIComponent(targetMid)}&format=json&nobase64=1`,
        {
          signal: controller.signal,
          headers: commonHeaders,
        }
      );

      clearTimeout(timeoutId);

      if (lyricRes.ok) {
        const text = await lyricRes.text();
        let json: any = null;
        try {
          if (text.startsWith('MusicJsonCallback(')) {
            const jsonStr = text.slice('MusicJsonCallback('.length, -1);
            json = JSON.parse(jsonStr);
          } else {
            json = JSON.parse(text);
          }
        } catch (e) {}

        if (json?.lyric) {
          let decoded = json.lyric;
          if (!decoded.includes('[') && !decoded.includes('\n')) {
            try {
              decoded = Buffer.from(decoded, 'base64').toString('utf-8');
            } catch (e) {}
          }
          rawLyric = decodeHtmlEntities(decoded);
        }

        if (json?.trans) {
          let transDecoded = json.trans;
          if (!transDecoded.includes('[') && !transDecoded.includes('\n')) {
            try {
              transDecoded = Buffer.from(transDecoded, 'base64').toString('utf-8');
            } catch (e) {}
          }
          rawTLyric = decodeHtmlEntities(transDecoded);
        }
      }
    } catch (err) {
      console.warn('QQ fallback lyric fetch failed:', err);
    }
  }

  if (!rawLyric) {
    const fallback = findFallbackByIdOrKeyword(id);
    if (fallback) {
      rawLyric = fallback.lrc;
      rawTLyric = fallback.tlyric || '';
    }
  }

  const parsed = parseLrc(rawLyric, rawTLyric);
  return { lyrics: parsed, rawLyric, rawTLyric, albumCover };
}

function findFallbackByIdOrKeyword(query: string) {
  const decoded = decodeURIComponent(query).toLowerCase();
  return POPULAR_SONG_DB.find(
    (s) =>
      decoded.includes(s.name.toLowerCase()) ||
      decoded.includes(s.keyword.toLowerCase()) ||
      s.name.toLowerCase().includes(decoded)
  );
}
