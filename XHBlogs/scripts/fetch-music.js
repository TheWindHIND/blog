// 构建前获取网易云音乐数据，保存为静态 JSON 文件
// 用于静态导出模式下的音乐播放

const fs = require('fs');
const path = require('path');

// 网易云 API 请求头
const NET_EASE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Referer': 'https://music.163.com/',
};

// 从 siteConfig.ts 中提取 cloudMusicIds
function extractMusicIds() {
  const siteConfigPath = path.join(__dirname, '..', 'siteConfig.ts');
  const content = fs.readFileSync(siteConfigPath, 'utf-8');
  
  // 匹配 cloudMusicIds 数组
  const match = content.match(/cloudMusicIds:\s*\[([^\]]+)\]/);
  if (!match) {
    console.log('⚠️  未找到 cloudMusicIds 配置');
    return [];
  }
  
  // 提取所有数字 ID
  const ids = match[1].match(/"(\d+)"/g);
  if (!ids) {
    console.log('⚠️  cloudMusicIds 为空');
    return [];
  }
  
  return ids.map(s => s.replace(/"/g, ''));
}

// 获取歌曲详情
async function fetchSongDetail(songId) {
  try {
    const url = `https://music.163.com/api/song/detail/?id=${songId}&ids=[${songId}]`;
    const response = await fetch(url, { headers: NET_EASE_HEADERS });
    const data = await response.json();
    
    const song = data.songs?.[0];
    if (!song) {
      return { id: songId, error: 'not_found' };
    }
    
    const artistName = song.artists?.[0]?.name || '未知歌手';
    
    return {
      id: songId,
      name: song.name,
      artist: artistName,
      author: artistName,
      cover: song.album?.picUrl || '',
      pic: song.album?.picUrl || '',
      url: `https://music.163.com/song/media/outer/url?id=${songId}.mp3`,
    };
  } catch (error) {
    console.error(`  ❌ 获取歌曲 ${songId} 详情失败:`, error.message);
    return { id: songId, error: String(error) };
  }
}

// 获取歌词
async function fetchSongLyric(songId) {
  try {
    const url = `https://music.163.com/api/song/lyric?id=${songId}&lv=-1&kv=-1&tv=-1`;
    const response = await fetch(url, { headers: NET_EASE_HEADERS });
    const data = await response.json();
    return data.lrc?.lyric || '';
  } catch (error) {
    console.error(`  ❌ 获取歌曲 ${songId} 歌词失败:`, error.message);
    return '';
  }
}

// 主函数
async function main() {
  console.log('\n🎵 开始获取网易云音乐数据...\n');
  
  // 1. 提取音乐 ID
  const songIds = extractMusicIds();
  console.log(`📋 找到 ${songIds.length} 首歌曲\n`);
  
  if (songIds.length === 0) {
    console.log('⚠️  没有歌曲，跳过');
    // 写入空数组
    const outputPath = path.join(__dirname, '..', 'public', 'music-data.json');
    fs.writeFileSync(outputPath, '[]', 'utf-8');
    return;
  }
  
  // 2. 并发获取所有歌曲详情和歌词
  const results = [];
  
  for (let i = 0; i < songIds.length; i++) {
    const songId = songIds[i];
    console.log(`  [${i + 1}/${songIds.length}] 正在获取: ${songId}`);
    
    const [detail, lyric] = await Promise.all([
      fetchSongDetail(songId),
      fetchSongLyric(songId),
    ]);
    
    if (!detail.error) {
      detail.lrc = lyric;
      console.log(`    ✅ ${detail.name} - ${detail.artist}`);
    } else {
      console.log(`    ❌ 获取失败`);
    }
    
    results.push(detail);
  }
  
  // 3. 过滤有效歌曲
  const validSongs = results.filter(song => song && song.url && !song.error);
  console.log(`\n✅ 成功获取 ${validSongs.length} / ${songIds.length} 首歌曲`);
  
  // 4. 保存为 JSON 文件
  const outputPath = path.join(__dirname, '..', 'public', 'music-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(validSongs, null, 2), 'utf-8');
  console.log(`\n💾 已保存到: ${outputPath}\n`);
}

main().catch(error => {
  console.error('💥 获取音乐数据失败:', error);
  // 即使失败也写入空数组，避免构建失败
  const outputPath = path.join(__dirname, '..', 'public', 'music-data.json');
  try {
    fs.writeFileSync(outputPath, '[]', 'utf-8');
  } catch (e) {}
  process.exit(0); // 不中断构建
});
