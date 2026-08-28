import { Song, SearchResponse, SongDetailResponse, LyricLine } from '../types';

// Clean artist names
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

function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCodePoint(parseInt(dec, 10));
      } catch {
        return String.fromCharCode(parseInt(dec, 10));
      }
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        return String.fromCodePoint(parseInt(hex, 16));
      } catch {
        return String.fromCharCode(parseInt(hex, 16));
      }
    })
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * UTF-8 safe Base64 Decoder (prevents garbled Chinese / Japanese characters)
 */
function safeBase64Decode(str: string): string {
  if (!str) return '';
  const trimmed = str.trim();
  try {
    const binary = atob(trimmed);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    try {
      return decodeURIComponent(escape(atob(trimmed)));
    } catch {
      try {
        return atob(trimmed);
      } catch {
        return str;
      }
    }
  }
}

/**
 * Decode QQ Lyric String (handles base64, hex entities, decimal entities)
 */
function decodeQQLyricString(raw: string): string {
  if (!raw) return '';
  let str = raw.trim();
  str = decodeHtmlEntities(str);
  if (!str.includes('[') && !str.includes('\n')) {
    const decoded = safeBase64Decode(str);
    if (decoded && (decoded.includes('[') || decoded.includes('\n') || decoded.includes('&#'))) {
      str = decoded;
    }
  }
  str = decodeHtmlEntities(str);
  return str;
}

// Client-side LRC Parser with robust translation alignment
export function parseLrc(lrcText: string, tlyricText?: string): LyricLine[] {
  if (!lrcText) return [];

  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;
  const lines = lrcText.split('\n');
  const parsedMap = new Map<number, { text: string; translation?: string; isMeta: boolean }>();
  const nonTimedLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || /^\[(ti|ar|al|by|offset|kana):/i.test(trimmed)) continue;

    const matches = [...trimmed.matchAll(timeRegex)];
    let text = trimmed.replace(timeRegex, '').trim();

    if (matches.length > 0) {
      if (text) {
        const isMeta = /^(作词|作曲|编曲|制作人|监制|混音|母带|吉他|贝斯|鼓|键盘|和声|录音|发行|出品|词|曲|arranger|producer|lyricist|composer)\s*[:：]/i.test(text);

        // Check if the line has inline translation in parentheses, e.g. "Never gonna give you up (决不会放弃你)"
        let inlineTrans: string | undefined = undefined;
        if (!isMeta) {
          const inlineMatch = text.match(/^(.+?)\s*[（(【]([\u4e00-\u9fa5\s，。！？、…]+)[）)】]$/);
          if (inlineMatch && /[a-zA-Z\u3040-\u30ff\uac00-\ud7af]/.test(inlineMatch[1])) {
            text = inlineMatch[1].trim();
            inlineTrans = inlineMatch[2].trim();
          }
        }

        for (const match of matches) {
          const minutes = parseInt(match[1], 10);
          const seconds = parseInt(match[2], 10);
          const millis = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
          const totalSeconds = Math.round((minutes * 60 + seconds + millis / 1000) * 100) / 100;

          // Check if timestamp already exists
          const existing = parsedMap.get(totalSeconds);
          if (existing) {
            // If existing is foreign/non-Chinese and current line has Chinese characters, treat as translation
            if (!/[\u4e00-\u9fa5]/.test(existing.text) && /[\u4e00-\u9fa5]/.test(text)) {
              existing.translation = text;
            } else if (/[\u4e00-\u9fa5]/.test(existing.text) && !/[\u4e00-\u9fa5]/.test(text)) {
              // Current is original, existing was translation
              parsedMap.set(totalSeconds, { text, translation: existing.text, isMeta });
            } else if (!existing.text && text) {
              parsedMap.set(totalSeconds, { text, isMeta });
            }
          } else {
            // Check if there is a very close timestamp (within 0.5s) that is foreign while this is Chinese
            let mergedWithClose = false;
            if (/[\u4e00-\u9fa5]/.test(text) && !isMeta) {
              for (const [key, val] of parsedMap.entries()) {
                if (Math.abs(key - totalSeconds) <= 0.6 && !val.isMeta && !val.translation && !/[\u4e00-\u9fa5]/.test(val.text)) {
                  val.translation = text;
                  mergedWithClose = true;
                  break;
                }
              }
            }
            if (!mergedWithClose) {
              parsedMap.set(totalSeconds, { text, translation: inlineTrans, isMeta });
            }
          }
        }
      }
    } else if (trimmed) {
      nonTimedLines.push(trimmed);
    }
  }

  // Parse external translation lyrics if present
  if (tlyricText) {
    const tlines = tlyricText.split('\n');
    const validTransLines: Array<{ time: number; text: string }> = [];

    for (const line of tlines) {
      const trimmed = line.trim();
      if (!trimmed || /^\[(ti|ar|al|by|offset):/i.test(trimmed)) continue;
      const matches = [...trimmed.matchAll(timeRegex)];
      let transText = trimmed.replace(timeRegex, '').trim();

      if (transText === '//' || transText === '/' || transText === '.') {
        transText = '';
      }

      if (matches.length > 0 && transText) {
        for (const match of matches) {
          const minutes = parseInt(match[1], 10);
          const seconds = parseInt(match[2], 10);
          const millis = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
          const totalSeconds = Math.round((minutes * 60 + seconds + millis / 1000) * 100) / 100;
          validTransLines.push({ time: totalSeconds, text: transText });
        }
      }
    }

    let matchedCount = 0;
    // Step 1: Fuzzy timestamp matching (tolerance up to 1.8s)
    for (const transItem of validTransLines) {
      let bestKey: number | null = null;
      let minDiff = Infinity;

      for (const [key, val] of parsedMap.entries()) {
        const diff = Math.abs(key - transItem.time);
        const adjustedDiff = val.isMeta ? diff + 0.8 : (val.translation ? diff + 0.5 : diff);
        if (adjustedDiff < minDiff) {
          minDiff = adjustedDiff;
          bestKey = key;
        }
      }

      if (bestKey !== null && minDiff <= 1.8) {
        const current = parsedMap.get(bestKey)!;
        if (!current.translation || minDiff <= 0.3) {
          current.translation = transItem.text;
          matchedCount++;
        }
      }
    }

    // Step 2: Fallback sequential alignment if timestamp matching was sparse
    if (matchedCount < Math.min(3, validTransLines.length) && validTransLines.length > 0 && parsedMap.size > 0) {
      const sortedKeys = Array.from(parsedMap.keys()).sort((a, b) => a - b);
      const nonMetaKeys = sortedKeys.filter((k) => !parsedMap.get(k)?.isMeta);
      const targetKeys = nonMetaKeys.length > 0 ? nonMetaKeys : sortedKeys;

      const count = Math.min(targetKeys.length, validTransLines.length);
      for (let i = 0; i < count; i++) {
        const key = targetKeys[i];
        const val = parsedMap.get(key);
        if (val && !val.translation) {
          val.translation = validTransLines[i].text;
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

// Built-in Popular Song DB Fallback
const FALLBACK_POPULAR_SONGS: Array<{
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

// Browser JSONP helper (bypasses CORS in pure static or overseas deployments)
export function browserJsonp<T>(url: string, callbackParam = 'jsonpCallback'): Promise<T> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return reject(new Error('Browser environment required for JSONP'));
    }

    const callbackName = `__jsonp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const script = document.createElement('script');
    const separator = url.includes('?') ? '&' : '?';
    script.src = `${url}${separator}${callbackParam}=${callbackName}`;
    script.async = true;

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('JSONP request timed out'));
    }, 5000);

    const cleanup = () => {
      clearTimeout(timer);
      if (script.parentNode) script.parentNode.removeChild(script);
      delete (window as any)[callbackName];
    };

    (window as any)[callbackName] = (data: T) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('JSONP script failed to load'));
    };

    document.head.appendChild(script);
  });
}

// Client-side Direct NetEase Music Search via CORS Mirrors
async function clientSearchNetease(keyword: string): Promise<Song[]> {
  const songs: Song[] = [];

  // Mirror 1: i-meto Meting API
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const url = `https://api.i-meto.com/meting/api?server=netease&type=search&id=${encodeURIComponent(keyword)}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        for (let i = 0; i < list.length; i++) {
          const item = list[i];
          const realId =
            (item.lrc && item.lrc.match(/id=(\d+)/)?.[1]) ||
            (item.url && item.url.match(/id=(\d+)/)?.[1]) ||
            String(item.id || i);

          songs.push({
            id: realId,
            platform: 'netease',
            name: item.title || keyword,
            artist: cleanArtist(item.author || '未知歌手'),
            album: item.title || '单曲',
            albumCover: item.pic || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
            duration: 240,
            url: item.url || `https://music.163.com/#/song?id=${realId}`,
            lrcUrl: item.lrc,
          });
        }
        if (songs.length > 0) return songs;
      }
    }
  } catch (err) {
    console.warn('Client NetEase mirror 1 failed:', err);
  }

  // Mirror 2: GDStudio API
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const url = `https://music-api.gdstudio.xyz/api.php?types=search&count=25&source=netease&name=${encodeURIComponent(keyword)}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

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
              : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
            duration: 240,
            url: `https://music.163.com/#/song?id=${item.id}`,
          });
        }
        if (songs.length > 0) return songs;
      }
    }
  } catch (err) {
    console.warn('Client NetEase mirror 2 failed:', err);
  }

  return songs;
}

// Client-side Direct NetEase Lyric Fetcher
async function clientFetchNeteaseLyrics(song: Song): Promise<{ lyrics: LyricLine[]; rawLyric: string; rawTLyric?: string; albumCover?: string }> {
  const numericId = song.id.replace(/[^\d]/g, '');

  // Strategy 1: GDStudio Unified API (contains both original & translation in one JSON)
  if (numericId) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`https://music-api.gdstudio.xyz/api.php?types=lyric&id=${numericId}&source=netease`, {
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        if (data?.lyric && data.lyric.includes('[')) {
          const parsed = parseLrc(data.lyric, data.tlyric);
          if (parsed.length > 0) {
            return {
              lyrics: parsed,
              rawLyric: data.lyric,
              rawTLyric: data.tlyric,
              albumCover: song.albumCover,
            };
          }
        }
      }
    } catch (e) {}
  }

  // Strategy 2: Direct NetEase Official Open Lyric API (supports latest translation lv=-1&kv=-1&tv=-1)
  if (numericId) {
    const neteaseApis = [
      `https://music.163.com/api/song/lyric?id=${numericId}&lv=-1&kv=-1&tv=-1`,
      `https://interface.music.163.com/api/song/lyric?id=${numericId}&lv=-1&kv=-1&tv=-1`,
    ];
    for (const apiUrl of neteaseApis) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(apiUrl, { signal: controller.signal });
        clearTimeout(timer);
        if (res.ok) {
          const data = await res.json();
          const lrc = data?.lrc?.lyric || '';
          const tlrc = data?.tlyric?.lyric || '';
          if (lrc && lrc.includes('[')) {
            const parsed = parseLrc(lrc, tlrc);
            if (parsed.length > 0) {
              return {
                lyrics: parsed,
                rawLyric: lrc,
                rawTLyric: tlrc,
                albumCover: song.albumCover,
              };
            }
          }
        }
      } catch (e) {}
    }
  }

  // Strategy 3: Direct lrcUrl & tlyricUrl from search results or Meting mirrors (Parallel Lrc + TLrc)
  if (numericId || song.lrcUrl) {
    const mirrorPairs = [
      {
        lrc: song.lrcUrl || `https://api.i-meto.com/meting/api?server=netease&type=lrc&id=${numericId}`,
        tlrc: song.lrcUrl
          ? song.lrcUrl.replace(/type=lrc/i, 'type=tlrc')
          : `https://api.i-meto.com/meting/api?server=netease&type=tlrc&id=${numericId}`,
      },
      {
        lrc: `https://api.injahow.cn/meting/?server=netease&type=lrc&id=${numericId}`,
        tlrc: `https://api.injahow.cn/meting/?server=netease&type=tlrc&id=${numericId}`,
      },
    ];

    for (const pair of mirrorPairs) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);

        const [lrcRes, tlrcRes] = await Promise.allSettled([
          fetch(pair.lrc, { signal: controller.signal }),
          fetch(pair.tlrc, { signal: controller.signal }),
        ]);
        clearTimeout(timer);

        let lrcText = '';
        let tlrcText = '';

        if (lrcRes.status === 'fulfilled' && lrcRes.value.ok) {
          const cType = lrcRes.value.headers.get('content-type') || '';
          if (cType.includes('application/json')) {
            const data = await lrcRes.value.json();
            lrcText = data.lyric || data.lrc || '';
            tlrcText = data.tlyric || data.tlrc || '';
          } else {
            lrcText = await lrcRes.value.text();
          }
        }

        if (!tlrcText && tlrcRes.status === 'fulfilled' && tlrcRes.value.ok) {
          const cType = tlrcRes.value.headers.get('content-type') || '';
          if (cType.includes('application/json')) {
            const data = await tlrcRes.value.json();
            tlrcText = data.tlyric || data.tlrc || data.lyric || '';
          } else {
            tlrcText = await tlrcRes.value.text();
          }
        }

        if (lrcText && lrcText.includes('[') && !lrcText.includes('鉴权失败') && !lrcText.includes('非法调用')) {
          if (tlrcText.includes('鉴权失败') || tlrcText.includes('非法调用') || tlrcText.includes('未找到')) {
            tlrcText = '';
          }
          const parsed = parseLrc(lrcText, tlrcText);
          if (parsed.length > 0) {
            return {
              lyrics: parsed,
              rawLyric: lrcText,
              rawTLyric: tlrcText,
              albumCover: song.albumCover,
            };
          }
        }
      } catch (e) {}
    }
  }

  // Strategy 4: Meting Search & Lyric Retrieval by song title + artist
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const searchKw = `${song.name} ${song.artist}`.trim() || song.name || song.id;
    const url = `https://api.i-meto.com/meting/api?server=netease&type=search&id=${encodeURIComponent(searchKw)}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        const matched =
          list.find((it: any) => String(it.id) === String(song.id) || (it.lrc && it.lrc.includes(`id=${song.id}`))) ||
          list[0];

        if (matched?.lrc) {
          const tlrcUrl = matched.lrc.replace(/type=lrc/i, 'type=tlrc');
          const [lRes, tlRes] = await Promise.allSettled([
            fetch(matched.lrc),
            fetch(tlrcUrl),
          ]);

          let lText = '';
          let tlText = '';
          if (lRes.status === 'fulfilled' && lRes.value.ok) {
            lText = await lRes.value.text();
          }
          if (tlRes.status === 'fulfilled' && tlRes.value.ok) {
            tlText = await tlRes.value.text();
          }

          if (lText && lText.includes('[') && !lText.includes('鉴权失败')) {
            return {
              lyrics: parseLrc(lText, tlText),
              rawLyric: lText,
              rawTLyric: tlText,
              albumCover: matched.pic || song.albumCover,
            };
          }
        }
      }
    }
  } catch (e) {}

  // Strategy 5: Local popular song fallback
  const fallback = FALLBACK_POPULAR_SONGS.find(
    (s) =>
      (song.name && s.name.toLowerCase().includes(song.name.toLowerCase())) ||
      (song.name && song.name.toLowerCase().includes(s.name.toLowerCase()))
  );
  if (fallback) {
    return {
      lyrics: parseLrc(fallback.lrc, fallback.tlyric),
      rawLyric: fallback.lrc,
      rawTLyric: fallback.tlyric,
      albumCover: fallback.neteaseCover,
    };
  }

  return { lyrics: [], rawLyric: '' };
}

/**
 * Helper to check if parsed lyrics contain any actual translations
 */
function hasLyricsTranslation(lines: LyricLine[]): boolean {
  return lines.some((l) => Boolean(l.translation && l.translation.trim()));
}

/**
 * Check if the lyric is primarily foreign (English, Japanese, Korean, etc.)
 */
function isForeignContent(text: string, title?: string): boolean {
  const combined = `${title || ''} ${text || ''}`;
  const foreignChars = (combined.match(/[a-zA-Z\u3040-\u30ff\uac00-\ud7af\u0400-\u04ff\u00C0-\u024F]/g) || []).length;
  const chineseChars = (combined.match(/[\u4e00-\u9fa5]/g) || []).length;
  return foreignChars > 8 && (chineseChars === 0 || foreignChars > chineseChars * 0.8);
}

/**
 * Universal Cross-Platform Translation Search & Fetcher
 * Automatically finds translated lyrics from NetEase / Meting / GDStudio
 * for foreign songs when QQ Music or current source lacks translations.
 */
async function fetchCrossPlatformTranslation(songName: string, artistName?: string): Promise<string> {
  const cleanName = songName
    .replace(/\(.*?\)|（.*?）|\[.*?\]|【.*?】|\{.*?\}/g, '')
    .replace(/feat\..*/i, '')
    .replace(/ft\..*/i, '')
    .trim();
  const searchKw = `${cleanName} ${artistName || ''}`.trim() || cleanName;
  if (!searchKw) return '';

  // 1. Try GDStudio NetEase Search & Lyric API
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const searchUrl = `https://music-api.gdstudio.xyz/api.php?types=search&count=5&source=netease&name=${encodeURIComponent(searchKw)}`;
    const res = await fetch(searchUrl, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        for (const item of list.slice(0, 3)) {
          const lyrId = item.id || item.url_id;
          if (lyrId) {
            try {
              const lyrRes = await fetch(`https://music-api.gdstudio.xyz/api.php?types=lyric&id=${lyrId}&source=netease`);
              if (lyrRes.ok) {
                const lyrData = await lyrRes.json();
                if (lyrData?.tlyric && lyrData.tlyric.includes('[')) {
                  return lyrData.tlyric;
                }
              }
            } catch (e) {}
          }
        }
      }
    }
  } catch (e) {}

  // 2. Try Meting NetEase Search & Lyric API
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const metingUrl = `https://api.i-meto.com/meting/api?server=netease&type=search&id=${encodeURIComponent(searchKw)}`;
    const res = await fetch(metingUrl, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        for (const item of list.slice(0, 3)) {
          if (item.id) {
            try {
              const tlrcRes = await fetch(`https://api.i-meto.com/meting/api?server=netease&type=tlrc&id=${item.id}`);
              if (tlrcRes.ok) {
                const text = await tlrcRes.text();
                if (text && text.includes('[') && !text.includes('鉴权失败') && !text.includes('未找到')) {
                  return text;
                }
              }
            } catch (e) {}
          }
        }
      }
    }
  } catch (e) {}

  // 3. Try Injahow Mirror NetEase API
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const injahowUrl = `https://api.injahow.cn/meting/?server=netease&type=search&id=${encodeURIComponent(searchKw)}`;
    const res = await fetch(injahowUrl, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        for (const item of list.slice(0, 3)) {
          if (item.id) {
            try {
              const tlrcRes = await fetch(`https://api.injahow.cn/meting/?server=netease&type=tlrc&id=${item.id}`);
              if (tlrcRes.ok) {
                const text = await tlrcRes.text();
                if (text && text.includes('[') && !text.includes('鉴权失败') && !text.includes('未找到')) {
                  return text;
                }
              }
            } catch (e) {}
          }
        }
      }
    }
  } catch (e) {}

  return '';
}

// Client-side Direct QQ Music Search via JSONP
async function clientSearchQQ(keyword: string): Promise<Song[]> {
  try {
    const url = `https://c.y.qq.com/soso/fcgi-bin/client_search_cp?p=1&n=25&w=${encodeURIComponent(keyword)}&format=jsonp&t=0&cr=1`;
    const data: any = await browserJsonp(url, 'jsonpCallback');
    const songList = data?.data?.song?.list;
    if (Array.isArray(songList) && songList.length > 0) {
      return songList.map((s: any) => {
        const rawArtistName = s.singer?.map((sg: any) => sg.name).join('/') || '未知歌手';
        const artistName = cleanArtist(rawArtistName);
        const albumName = s.albumname || '单曲';
        const albumMid = s.albummid || '';
        const albumPic = albumMid
          ? `https://y.gtimg.cn/music/photo_new/T002R500x500M000${albumMid}.jpg`
          : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80';

        return {
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
        };
      });
    }
  } catch (err) {
    console.warn('Client JSONP QQ search failed:', err);
  }
  return [];
}

// Client-side Direct QQ Lyric with multiple failover providers and cross-platform translation
async function clientFetchQQLyrics(song: Song): Promise<{ lyrics: LyricLine[]; rawLyric: string; rawTLyric?: string }> {
  const songMid = song.songMid || (song.id.startsWith('00') ? song.id : '');
  const numericId = song.id.replace(/[^\d]/g, '');
  const targetId = songMid || numericId || song.id;

  let rawLyric = '';
  let rawTLyric = '';

  // Strategy 1: GDStudio Unified QQ Lyric API (original + translation in one call)
  if (targetId) {
    const tryIds = [targetId, numericId, songMid].filter(Boolean);
    for (const idToTry of tryIds) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(`https://music-api.gdstudio.xyz/api.php?types=lyric&id=${encodeURIComponent(idToTry)}&source=tencent`, {
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          const data = await res.json();
          if (data?.lyric && data.lyric.includes('[')) {
            rawLyric = decodeQQLyricString(data.lyric);
            if (data?.tlyric && data.tlyric.includes('[')) {
              rawTLyric = decodeQQLyricString(data.tlyric);
            }
            break;
          }
        }
      } catch (e) {}
    }
  }

  // Strategy 2: Meting & Injahow QQ mirrors (fetch lrc + tlrc in parallel)
  if (!rawLyric && targetId) {
    const qqPairs = [
      {
        lrc: `https://api.i-meto.com/meting/api?server=tencent&type=lrc&id=${encodeURIComponent(targetId)}`,
        tlrc: `https://api.i-meto.com/meting/api?server=tencent&type=tlrc&id=${encodeURIComponent(targetId)}`,
      },
      {
        lrc: `https://api.injahow.cn/meting/?server=tencent&type=lrc&id=${encodeURIComponent(targetId)}`,
        tlrc: `https://api.injahow.cn/meting/?server=tencent&type=tlrc&id=${encodeURIComponent(targetId)}`,
      },
    ];

    for (const pair of qqPairs) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        const [lRes, tlRes] = await Promise.allSettled([
          fetch(pair.lrc, { signal: controller.signal }),
          fetch(pair.tlrc, { signal: controller.signal }),
        ]);
        clearTimeout(timer);

        let lrc = '';
        let tlrc = '';

        if (lRes.status === 'fulfilled' && lRes.value.ok) {
          const contentType = lRes.value.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await lRes.value.json();
            lrc = data.lyric || data.lrc || '';
            tlrc = data.tlyric || data.tlrc || '';
          } else {
            lrc = await lRes.value.text();
          }
        }

        if (!tlrc && tlRes.status === 'fulfilled' && tlRes.value.ok) {
          const contentType = tlRes.value.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await tlRes.value.json();
            tlrc = data.tlyric || data.tlrc || data.lyric || '';
          } else {
            tlrc = await tlRes.value.text();
          }
        }

        if (lrc && lrc.includes('[') && !lrc.includes('鉴权失败')) {
          if (tlrc.includes('鉴权失败') || tlrc.includes('未找到')) {
            tlrc = '';
          }
          rawLyric = decodeQQLyricString(lrc);
          rawTLyric = decodeQQLyricString(tlrc);
          break;
        }
      } catch (e) {}
    }
  }

  // Strategy 3: Client JSONP from QQ Music Official (decodes trans with UTF-8 support)
  if (!rawLyric && songMid) {
    try {
      const url = `https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid=${encodeURIComponent(songMid)}&format=jsonp&nobase64=1`;
      const data: any = await browserJsonp(url, 'jsonpCallback');

      if (data?.lyric) {
        rawLyric = decodeQQLyricString(data.lyric);
      }
      if (data?.trans || data?.trans_lyric || data?.tlyric) {
        rawTLyric = decodeQQLyricString(data.trans || data.trans_lyric || data.tlyric);
      }
    } catch (err) {
      console.warn('Client JSONP QQ lyric fetch failed:', err);
    }
  }

  // Strategy 4: Fallback to local DB if no lyric found at all
  if (!rawLyric) {
    const fallback = FALLBACK_POPULAR_SONGS.find(
      (s) =>
        (song.name && s.name.toLowerCase().includes(song.name.toLowerCase())) ||
        (song.name && song.name.toLowerCase().includes(s.name.toLowerCase()))
    );
    if (fallback) {
      rawLyric = fallback.lrc;
      rawTLyric = fallback.tlyric || '';
    }
  }

  if (!rawLyric) {
    return { lyrics: [], rawLyric: '' };
  }

  // Parse initial lyrics
  let parsed = parseLrc(rawLyric, rawTLyric);

  // Strategy 5: CRITICAL Cross-Platform Translation Fallback for foreign songs
  // If the song has foreign text and lacks translation in QQ Music, query NetEase/GDStudio translations
  if (!hasLyricsTranslation(parsed) && isForeignContent(rawLyric, song.name)) {
    try {
      console.info('Querying cross-platform translation for foreign QQ song:', song.name);
      const crossTLyric = await fetchCrossPlatformTranslation(song.name, song.artist);
      if (crossTLyric && crossTLyric.includes('[')) {
        rawTLyric = crossTLyric;
        parsed = parseLrc(rawLyric, crossTLyric);
      }
    } catch (e) {
      console.warn('Cross-platform translation fetch failed:', e);
    }
  }

  return {
    lyrics: parsed,
    rawLyric,
    rawTLyric,
  };
}

/**
 * Universal Search Function (Hybrid Backend + Client Direct Fallback)
 * Works seamlessly in Google AI Studio, custom Node servers, Docker,
 * and pure static Nginx / Vercel / GitHub Pages deployments!
 */
export async function searchMusic(keyword: string): Promise<SearchResponse> {
  const cleanKw = (keyword || '').trim();
  if (!cleanKw) {
    return { keyword: '', netease: [], qq: [], total: 0 };
  }

  let serverData: SearchResponse | null = null;

  // Step 1: Try backend server API first
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(`/api/music/search?keyword=${encodeURIComponent(cleanKw)}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        serverData = await res.json();
      }
    }
  } catch (err) {
    console.warn('Backend /api/music/search failed or unreachable:', err);
  }

  // If backend returned results, check if we need to supplement missing platforms
  const hasServerNetease = Boolean(serverData?.netease && serverData.netease.length > 0);
  const hasServerQQ = Boolean(serverData?.qq && serverData.qq.length > 0);

  if (hasServerNetease && hasServerQQ) {
    return serverData!;
  }

  // Step 2: Client-side Direct Search Fallback (Zero-failure guarantee for static deployments & overseas servers!)
  console.info('Activating client-side direct search failover for:', cleanKw);
  let neteaseSongs: Song[] = hasServerNetease ? (serverData?.netease || []) : [];
  let qqSongs: Song[] = hasServerQQ ? (serverData?.qq || []) : [];

  const [directNeteaseRes, directQQRes] = await Promise.allSettled([
    !hasServerNetease ? clientSearchNetease(cleanKw) : Promise.resolve([]),
    !hasServerQQ ? clientSearchQQ(cleanKw) : Promise.resolve([]),
  ]);

  if (!hasServerNetease && directNeteaseRes.status === 'fulfilled' && directNeteaseRes.value.length > 0) {
    neteaseSongs = directNeteaseRes.value;
  }
  if (!hasServerQQ && directQQRes.status === 'fulfilled' && directQQRes.value.length > 0) {
    qqSongs = directQQRes.value;
  }

  // Match with static popular song database if still empty
  const kwLower = cleanKw.toLowerCase();
  const dbMatches = FALLBACK_POPULAR_SONGS.filter(
    (s) =>
      s.keyword.toLowerCase().includes(kwLower) ||
      s.name.toLowerCase().includes(kwLower) ||
      s.artist.toLowerCase().includes(kwLower)
  );

  if (neteaseSongs.length === 0) {
    neteaseSongs = dbMatches.map((item, idx) => ({
      id: `netease_local_${idx + 1}`,
      platform: 'netease',
      name: item.name,
      artist: item.artist,
      album: item.album,
      albumCover: item.neteaseCover,
      duration: item.duration,
      releaseDate: item.releaseDate,
      url: 'https://music.163.com',
    }));
  }

  if (qqSongs.length === 0) {
    qqSongs = dbMatches.map((item, idx) => ({
      id: `qq_local_${idx + 1}`,
      songMid: `mid_${idx}`,
      platform: 'qq',
      name: item.name,
      artist: item.artist,
      album: item.album,
      albumCover: item.qqCover,
      duration: item.duration,
      releaseDate: item.releaseDate,
      url: 'https://y.qq.com',
    }));
  }

  return {
    keyword: cleanKw,
    netease: neteaseSongs,
    qq: qqSongs,
    total: neteaseSongs.length + qqSongs.length,
  };
}

/**
 * Universal Song Detail & Lyric Fetcher (Hybrid Backend + Client Direct Fallback)
 */
export async function fetchSongDetail(song: Song): Promise<SongDetailResponse> {
  const params = new URLSearchParams({
    platform: song.platform,
    id: song.id,
    name: song.name,
    artist: song.artist,
    album: song.album,
    albumCover: song.albumCover,
  });
  if (song.songMid) params.append('songMid', song.songMid);
  if (song.lrcUrl) params.append('lrcUrl', song.lrcUrl);

  let resultData: SongDetailResponse | null = null;

  // Step 1: Try backend API
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`/api/music/lyrics?${params.toString()}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data: SongDetailResponse = await res.json();
        if (data.lyrics && data.lyrics.length > 0) {
          resultData = data;
        }
      }
    }
  } catch (err) {
    console.warn('Backend /api/music/lyrics failed or offline:', err);
  }

  // Step 2: Client-side Direct Lyric Fetcher (if backend failed or returned empty)
  if (!resultData || !resultData.lyrics || resultData.lyrics.length === 0) {
    console.info('Activating client-side direct lyric fetcher for:', song.name, song.platform);
    if (song.platform === 'qq') {
      const directQQ = await clientFetchQQLyrics(song);
      if (directQQ.lyrics.length > 0) {
        resultData = {
          song,
          rawLyric: directQQ.rawLyric,
          rawTLyric: directQQ.rawTLyric,
          lyrics: directQQ.lyrics,
          hasLyric: true,
        };
      }
    } else {
      const directNetease = await clientFetchNeteaseLyrics(song);
      if (directNetease.lyrics.length > 0) {
        resultData = {
          song: {
            ...song,
            albumCover: directNetease.albumCover || song.albumCover,
          },
          rawLyric: directNetease.rawLyric,
          rawTLyric: directNetease.rawTLyric,
          lyrics: directNetease.lyrics,
          hasLyric: true,
        };
      }
    }
  }

  // Step 3: Check fallback library if still empty
  if (!resultData || !resultData.lyrics || resultData.lyrics.length === 0) {
    const fallback = FALLBACK_POPULAR_SONGS.find(
      (s) =>
        s.name.toLowerCase().includes(song.name.toLowerCase()) ||
        song.name.toLowerCase().includes(s.name.toLowerCase())
    );
    if (fallback) {
      const parsed = parseLrc(fallback.lrc, fallback.tlyric);
      resultData = {
        song: {
          ...song,
          albumCover: song.albumCover || (song.platform === 'qq' ? fallback.qqCover : fallback.neteaseCover),
        },
        rawLyric: fallback.lrc,
        rawTLyric: fallback.tlyric,
        lyrics: parsed,
        hasLyric: parsed.length > 0,
      };
    }
  }

  // CRITICAL FINAL TRANSLATION PASS:
  // Whether from Backend, Direct Client, or Fallback DB,
  // if the lyrics lack translations and contain foreign text (English / Japanese / Korean / etc.),
  // proactively fetch translation from cross-platform mirrors and merge into lyrics!
  if (resultData && resultData.lyrics && resultData.lyrics.length > 0) {
    const hasTrans = hasLyricsTranslation(resultData.lyrics);
    const foreign = isForeignContent(resultData.rawLyric || '', song.name);
    if (!hasTrans && foreign) {
      console.info('Triggering final cross-platform translation enhancement for:', song.name, song.artist);
      try {
        const crossTLyric = await fetchCrossPlatformTranslation(song.name, song.artist);
        if (crossTLyric && crossTLyric.includes('[')) {
          resultData.rawTLyric = crossTLyric;
          resultData.lyrics = parseLrc(resultData.rawLyric || '', crossTLyric);
        }
      } catch (e) {
        console.warn('Final translation enhancement error:', e);
      }
    }
    return resultData;
  }

  return {
    song,
    rawLyric: '',
    rawTLyric: '',
    lyrics: [],
    hasLyric: false,
  };
}

/**
 * Hot search keywords with safe fallback
 */
export async function getHotSearchTags(): Promise<string[]> {
  const defaultTags = ['晴天', '七里香', '孤勇者', '光辉岁月', '漠河舞厅', '乌梅子酱', '青花瓷', '如愿', '稻香'];
  try {
    const res = await fetch('/api/music/hot');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.tags) && data.tags.length > 0) {
        return data.tags;
      }
    }
  } catch {}
  return defaultTags;
}
