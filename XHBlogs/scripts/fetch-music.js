// 构建前获取网易云音乐数据，保存为静态 JSON 文件
// 使用 Meting API 作为主要方式，更稳定可靠
const fs = require('fs');
const path = require('path');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Referer': 'https://music.163.com/',
};

function extractMusicIds() {
  const siteConfigPath = path.join(__dirname, '..', 'siteConfig.ts');
  const content = fs.readFileSync(siteConfigPath, 'utf-8');
  const match = content.match(/cloudMusicIds:\s*\[([^\]]+)\]/);
  if (!match) return [];
  const ids = match[1].match(/"(\d+)"/g);
  if (!ids) return [];
  return ids.map(s => s.replace(/"/g, ''));
}

async function fetchSong(songId) {
  // 方式1: Meting API（推荐，稳定可靠）
  try {
    const url = `https://api.injahow.cn/meting/?server=netease&type=song&id=${songId}`;
    const res = await fetch(url, { headers: HEADERS });
    const data = await res.json();
    
    if (Array.isArray(data) && data.length > 0 && data[0].name) {
      const s = data[0];
      
      // 获取真实歌词文本
      let lrc = '';
      if (s.lrc) {
        try {
          const lrcRes = await fetch(s.lrc, { headers: HEADERS });
          lrc = await lrcRes.text();
        } catch (e) {}
      }
      
      console.log(`  ✅ ${s.name} - ${s.artist || '未知歌手'}`);
      
      return {
        id: songId,
        name: s.name,
        artist: s.artist || '未知歌手',
        author: s.artist || '未知歌手',
        cover: s.pic || '',
        pic: s.pic || '',
        url: s.url || '',
        lrc: lrc,
      };
    }
  } catch (e) {
    console.log(`  ⚠️  Meting API 失败: ${e.message}`);
  }
  
  // 方式2: 网易云官方接口（备用）
  try {
    console.log(`  📡 尝试官方接口...`);
    // 播放地址（手机UA绕过防盗链）
    const outerUrl = `https://music.163.com/song/media/outer/url?id=${songId}.mp3`;
    const mobileHeaders = {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      'Referer': 'https://music.163.com/',
    };
    const playRes = await fetch(outerUrl, { headers: mobileHeaders, redirect: 'follow' });
    let playUrl = playRes.url;
    if (playUrl.includes('/404')) throw new Error('404');
    if (playUrl.startsWith('http://')) playUrl = playUrl.replace('http://', 'https://');
    
    // 歌曲详情
    const detailUrl = `https://music.163.com/api/song/detail/?id=${songId}&ids=[${songId}]`;
    const detailRes = await fetch(detailUrl, { headers: HEADERS });
    const detailData = await detailRes.json();
    const song = detailData.songs?.[0];
    
    if (song) {
      const artistName = song.artists?.[0]?.name || '未知歌手';
      let coverUrl = song.album?.picUrl || '';
      if (coverUrl.startsWith('http://')) coverUrl = coverUrl.replace('http://', 'https://');
      
      // 歌词
      let lrc = '';
      try {
        const lrcUrl = `https://music.163.com/api/song/lyric?id=${songId}&lv=-1&kv=-1&tv=-1`;
        const lrcRes = await fetch(lrcUrl, { headers: HEADERS });
        const lrcData = await lrcRes.json();
        lrc = lrcData.lrc?.lyric || '';
      } catch (e) {}
      
      console.log(`  ✅ ${song.name} - ${artistName}`);
      
      return {
        id: songId,
        name: song.name,
        artist: artistName,
        author: artistName,
        cover: coverUrl,
        pic: coverUrl,
        url: playUrl,
        lrc: lrc,
      };
    }
  } catch (e) {
    console.log(`  ⚠️  官方接口失败: ${e.message}`);
  }
  
  console.log(`  ❌ 所有接口都失败，跳过歌曲 ${songId}`);
  return { id: songId, error: true };
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
