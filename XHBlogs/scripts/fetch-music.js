// 构建前获取网易云音乐数据，保存为静态 JSON 文件
// 用于静态导出模式下的音乐播放
const fs = require('fs');
const path = require('path');

// 网易云 API 请求头（桌面端，用于获取歌曲详情和歌词）
const NET_EASE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Referer': 'https://music.163.com/',
};

// 手机端 User-Agent（用于获取真实播放地址，绕过防盗链）
const MOBILE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
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

// 获取真实播放地址（用手机UA绕过防盗链，获取重定向后的真实地址，并转成HTTPS）
async function fetchRealPlayUrl(songId) {
  try {
    const outerUrl = `https://music.163.com/song/media/outer/url?id=${songId}.mp3`;
    
    // 使用 fetch 并设置 redirect: 'manual' 来获取重定向地址
    // 或者直接跟随重定向，获取最终的 URL
    const response = await fetch(outerUrl, {
      headers: MOBILE_HEADERS,
      redirect: 'follow',
    });
    
    // 获取最终的 URL
    let finalUrl = response.url;
    
    // 如果最终地址是 404 页面，返回空字符串
    if (finalUrl.includes('/404')) {
      console.log(`  ⚠️  歌曲 ${songId} 播放地址获取失败（404）`);
      return '';
    }
    
    // 把 http 改成 https（解决混合内容问题）
    if (finalUrl.startsWith('http://')) {
      finalUrl = finalUrl.replace('http://', 'https://');
    }
    
    return finalUrl;
  } catch (error) {
    console.error(`  ❌ 获取歌曲 ${songId} 播放地址失败:`, error.message);
    return '';
  }
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
    
    // 获取真实播放地址
    console.log(`  🎵 获取播放地址: ${song.name}`);
    const realUrl = await fetchRealPlayUrl(songId);
    
    return {
      id: songId,
      name: song.name,
      artist: artistName,
      author: artistName,
      cover: song.album?.picUrl || '',
      pic: song.album?.picUrl || '',
      url: realUrl || `https://music.163.com/song/media/outer/url?id=${songId}.mp3`,
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
    // 写入空数组
    const outputPath = path.join(__dirname, '..', 'public', 'music-data.json');
    fs.writeFileSync(outputPath, '[]', 'utf-8');
    console.log('\n✅ 音乐数据获取完成（空）\n');
    return;
  }
  
  // 2. 获取每首歌的详情和歌词
  const songs = [];
  
  for (let i = 0; i < songIds.length; i++) {
    const songId = songIds[i];
    console.log(`[${i + 1}/${songIds.length}] 处理歌曲 ID: ${songId}`);
    
    // 获取详情
    const detail = await fetchSongDetail(songId);
    
    if (detail.error) {
      console.log(`  ⚠️  跳过: ${detail.error}`);
      continue;
    }
    
    // 获取歌词
    const lrc = await fetchSongLyric(songId);
    
    songs.push({
      ...detail,
      lrc,
    });
    
    console.log(`  ✅ ${detail.name} - ${detail.artist}`);
    
    // 加个延迟，避免请求太快
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // 3. 保存到文件
  const outputPath = path.join(__dirname, '..', 'public', 'music-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(songs, null, 2), 'utf-8');
  
  console.log(`\n✅ 音乐数据获取完成，共 ${songs.length} 首歌`);
  console.log(`📁 保存到: ${outputPath}\n`);
}

// 运行
main().catch(error => {
  console.error('❌ 获取音乐数据失败:', error);
  // 即使失败也写入空数组，不中断构建
  const outputPath = path.join(__dirname, '..', 'public', 'music-data.json');
  try {
    fs.writeFileSync(outputPath, '[]', 'utf-8');
  } catch (e) {}
  process.exit(0);
});
