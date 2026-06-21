// 构建前获取网易云音乐数据，保存为静态 JSON 文件
// 优先使用官方接口（手机UA）获取真实播放地址，更稳定
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// 桌面浏览器 UA
const DESKTOP_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Referer': 'https://music.163.com/',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
};

// 手机浏览器 UA（绕过防盗链）
const MOBILE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  'Referer': 'https://music.163.com/',
};

// HTTP/HTTPS 请求封装
function fetchUrl(url, headers = {}, timeout = 10000, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    // 防止无限重定向
    if (redirectCount > 5) {
      reject(new Error('重定向次数过多'));
      return;
    }
    
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const req = client.get(url, { headers, timeout }, (res) => {
      // 处理重定向
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
        const redirectUrl = res.headers.location;
        if (redirectUrl) {
          // 处理相对路径重定向
          let finalRedirectUrl = redirectUrl;
          if (redirectUrl.startsWith('/')) {
            const urlObj = new URL(url);
            finalRedirectUrl = `${urlObj.protocol}//${urlObj.host}${redirectUrl}`;
          }
          fetchUrl(finalRedirectUrl, headers, timeout, redirectCount + 1).then(resolve).catch(reject);
          return;
        }
      }
      
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data, headers: res.headers, url: url });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时'));
    });
  });
}

function extractMusicIds() {
  const siteConfigPath = path.join(__dirname, '..', 'siteConfig.ts');
  const content = fs.readFileSync(siteConfigPath, 'utf-8');
  const match = content.match(/cloudMusicIds:\s*\[([^\]]+)\]/);
  if (!match) return [];
  const ids = match[1].match(/"(\d+)"/g);
  if (!ids) return [];
  return ids.map(s => s.replace(/"/g, ''));
}

// 获取播放地址（手机UA绕过防盗链）
async function getPlayUrl(songId) {
  try {
    const outerUrl = `https://music.163.com/song/media/outer/url?id=${songId}.mp3`;
    const res = await fetchUrl(outerUrl, MOBILE_HEADERS, 8000);
    
    // 检查是否是404
    if (res.url && res.url.includes('/404')) {
      throw new Error('404 not found');
    }
    if (res.status === 404) {
      throw new Error('404 not found');
    }
    
    // 获取最终的重定向地址
    let playUrl = res.url || outerUrl;
    
    // HTTP 转 HTTPS
    if (playUrl.startsWith('http://')) {
      playUrl = playUrl.replace('http://', 'https://');
    }
    
    return playUrl;
  } catch (e) {
    throw new Error(`播放地址获取失败: ${e.message}`);
  }
}

// 获取歌曲详情（接口1：官方桌面UA）
async function getSongDetailV1(songId) {
  try {
    const url = `https://music.163.com/api/song/detail/?id=${songId}&ids=[${songId}]`;
    const res = await fetchUrl(url, DESKTOP_HEADERS, 5000);
    const data = JSON.parse(res.data);
    
    if (data.songs && data.songs.length > 0) {
      const song = data.songs[0];
      let coverUrl = song.album?.picUrl || '';
      if (coverUrl.startsWith('http://')) coverUrl = coverUrl.replace('http://', 'https://');
      
      return {
        name: song.name,
        artist: song.artists?.[0]?.name || '未知歌手',
        cover: coverUrl,
      };
    }
    throw new Error('无歌曲数据');
  } catch (e) {
    throw new Error(`详情接口1失败: ${e.message}`);
  }
}

// 获取歌曲详情（接口2：Meting API）
async function getSongDetailV2(songId) {
  try {
    const url = `https://api.injahow.cn/meting/?server=netease&type=song&id=${songId}`;
    const res = await fetchUrl(url, DESKTOP_HEADERS, 8000);
    const data = JSON.parse(res.data);
    
    if (Array.isArray(data) && data.length > 0 && data[0].name) {
      const s = data[0];
      return {
        name: s.name,
        artist: s.artist || '未知歌手',
        cover: s.pic || '',
        url: s.url || '', // Meting API 也返回播放地址
      };
    }
    throw new Error('无歌曲数据');
  } catch (e) {
    throw new Error(`详情接口2失败: ${e.message}`);
  }
}

// 获取歌曲详情（接口3：官方手机UA）
async function getSongDetailV3(songId) {
  try {
    const url = `https://music.163.com/api/song/detail/?id=${songId}&ids=[${songId}]`;
    const res = await fetchUrl(url, MOBILE_HEADERS, 5000);
    const data = JSON.parse(res.data);
    
    if (data.songs && data.songs.length > 0) {
      const song = data.songs[0];
      let coverUrl = song.album?.picUrl || '';
      if (coverUrl.startsWith('http://')) coverUrl = coverUrl.replace('http://', 'https://');
      
      return {
        name: song.name,
        artist: song.artists?.[0]?.name || '未知歌手',
        cover: coverUrl,
      };
    }
    throw new Error('无歌曲数据');
  } catch (e) {
    throw new Error(`详情接口3失败: ${e.message}`);
  }
}

// 获取歌词
async function getLyric(songId) {
  try {
    const url = `https://music.163.com/api/song/lyric?id=${songId}&lv=-1&kv=-1&tv=-1`;
    const res = await fetchUrl(url, DESKTOP_HEADERS, 5000);
    const data = JSON.parse(res.data);
    return data.lrc?.lyric || '';
  } catch (e) {
    return '';
  }
}

async function fetchSong(songId) {
  // 第一步：获取播放地址（最重要）
  let playUrl = '';
  try {
    playUrl = await getPlayUrl(songId);
  } catch (e) {
    console.log(`  ⚠️  官方播放地址获取失败`);
    
    // 备用：试试 Meting API 的播放地址
    try {
      const detail = await getSongDetailV2(songId);
      if (detail.url) {
        playUrl = detail.url;
        console.log(`  ✅ 用 Meting API 播放地址`);
      }
    } catch (e2) {}
  }
  
  if (!playUrl) {
    console.log(`  ❌ 播放地址获取失败，跳过歌曲 ${songId}`);
    return { id: songId, error: true };
  }
  
  // 第二步：获取歌曲详情（三个接口依次尝试）
  let songDetail = null;
  
  // 尝试接口1：官方桌面UA
  try {
    songDetail = await getSongDetailV1(songId);
    console.log(`  ✅ [接口1] ${songDetail.name} - ${songDetail.artist}`);
  } catch (e) {
    console.log(`  ⚠️  接口1失败，尝试接口2...`);
  }
  
  // 尝试接口2：Meting API
  if (!songDetail) {
    try {
      songDetail = await getSongDetailV2(songId);
      console.log(`  ✅ [接口2] ${songDetail.name} - ${songDetail.artist}`);
    } catch (e) {
      console.log(`  ⚠️  接口2失败，尝试接口3...`);
    }
  }
  
  // 尝试接口3：官方手机UA
  if (!songDetail) {
    try {
      songDetail = await getSongDetailV3(songId);
      console.log(`  ✅ [接口3] ${songDetail.name} - ${songDetail.artist}`);
    } catch (e) {
      console.log(`  ⚠️  接口3也失败，使用默认信息`);
    }
  }
  
  // 第三步：获取歌词
  const lrc = await getLyric(songId);
  
  // 使用详情，没有详情就用默认信息
  const name = songDetail?.name || `歌曲 ${songId}`;
  const artist = songDetail?.artist || '未知歌手';
  const cover = songDetail?.cover || '';
  
  return {
    id: songId,
    name: name,
    artist: artist,
    author: artist,
    cover: cover,
    pic: cover,
    url: playUrl,
    lrc: lrc,
  };
}

async function main() {
  console.log('\n🎵 开始获取网易云音乐数据...\n');
  
  const songIds = extractMusicIds();
  console.log(`📋 找到 ${songIds.length} 首歌曲\n`);
  
  const results = [];
  
  for (let i = 0; i < songIds.length; i++) {
    const id = songIds[i];
    console.log(`[${i + 1}/${songIds.length}] 歌曲 ${id}`);
    const song = await fetchSong(id);
    results.push(song);
    if (i < songIds.length - 1) await new Promise(r => setTimeout(r, 300));
  }
  
  const success = results.filter(s => s && !s.error);
  console.log(`\n✅ 获取完成：成功 ${success.length} 首，失败 ${results.length - success.length} 首`);
  
  const outputPath = path.join(__dirname, '..', 'public', 'music-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(success, null, 2), 'utf-8');
  console.log(`💾 数据已保存到: ${outputPath}\n`);
}

main().catch(e => {
  console.error('❌ 脚本执行失败:', e);
  // 即使失败也写入空数组，避免构建中断
  const outputPath = path.join(__dirname, '..', 'public', 'music-data.json');
  fs.writeFileSync(outputPath, '[]', 'utf-8');
  process.exit(0);
});
