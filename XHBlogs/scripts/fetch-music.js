// 构建前获取网易云音乐数据，保存为静态 JSON 文件
// 用于静态导出模式下的音乐播放
const fs = require('fs');
const path = require('path');

// 网易云 API 请求头（桌面端，用于获取歌曲详情和歌词）
const NET_EASE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Referer': 'https://music.163.com/',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
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

// 获取歌曲详情（尝试多个接口，容错性更强）
async function fetchSongDetail(songId) {
  // 先获取播放地址（这个比较重要，即使详情获取失败也能播放）
  console.log(`  🎵 获取播放地址...`);
  const realUrl = await fetchRealPlayUrl(songId);
  
  if (!realUrl) {
    return { id: songId, error: 'play_url_not_found' };
  }
  
  // 尝试1：使用官方详情接口
  try {
    console.log(`  📡 尝试接口1: 官方详情接口...`);
    const url = `https://music.163.com/api/song/detail/?id=${songId}&ids=[${songId}]`;
    const response = await fetch(url, { headers: NET_EASE_HEADERS });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    const song = data.songs?.[0];
    if (song) {
      const artistName = song.artists?.[0]?.name || '未知歌手';
      
      return {
        id: songId,
        name: song.name,
        artist: artistName,
        author: artistName,
        cover: song.album?.picUrl || '',
        pic: song.album?.picUrl || '',
        url: realUrl,
      };
    }
    
    console.log(`  ⚠️  接口1返回数据异常`);
  } catch (error) {
    console.log(`  ⚠️  接口1失败: ${error.message}`);
  }
  
  // 尝试2：使用 meting API 作为备用
  try {
    console.log(`  📡 尝试接口2: Meting API...`);
    const url = `https://api.injahow.cn/meting/?server=netease&type=song&id=${songId}`;
    const response = await fetch(url, { headers: NET_EASE_HEADERS });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (Array.isArray(data) && data.length > 0) {
      const song = data[0];
      if (song.name) {
        return {
          id: songId,
          name: song.name,
          artist: song.artist || '未知歌手',
          author: song.artist || '未知歌手',
          cover: song.cover || '',
          pic: song.cover || '',
          url: realUrl, // 还是用我们自己获取的真实播放地址，更可靠
        };
      }
    }
    
    console.log(`  ⚠️  接口2返回数据异常`);
  } catch (error) {
    console.log(`  ⚠️  接口2失败: ${error.message}`);
  }
  
  // 尝试3：使用手机端UA的详情接口
  try {
    console.log(`  📡 尝试接口3: 手机端详情接口...`);
    const url = `https://music.163.com/api/song/detail/?id=${songId}&ids=[${songId}]`;
    const response = await fetch(url, { headers: MOBILE_HEADERS });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    const song = data.songs?.[0];
    if (song) {
      const artistName = song.artists?.[0]?.name || '未知歌手';
      
      return {
        id: songId,
        name: song.name,
        artist: artistName,
        author: artistName,
        cover: song.album?.picUrl || '',
        pic: song.album?.picUrl || '',
        url: realUrl,
      };
    }
    
    console.log(`  ⚠️  接口3返回数据异常`);
  } catch (error) {
    console.log(`  ⚠️  接口3失败: ${error.message}`);
  }
  
  // 如果所有接口都失败，返回基本信息（至少能播放）
  console.log(`  ℹ️  所有详情接口都失败，使用默认歌曲信息`);
  return {
    id: songId,
    name: `歌曲 ${songId}`,
    artist: '未知歌手',
    author: '未知歌手',
    cover: '',
    pic: '',
    url: realUrl,
  };
}

// 获取歌词
async function fetchSongLyric(songId) {
  try {
    const url = `https://music.163.com/api/song/lyric?id=${songId}&lv=-1&kv=-1&tv=-1`;
    const response = await fetch(url, { headers: NET_EASE_HEADERS });
    const data = await response.json();
    return data.lrc?.lyric || '';
  } catch (error) {
    console.log(`  ⚠️  获取歌词失败:`, error.message);
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
    
    // 获取详情（包含播放地址）
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
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // 3. 保存到文件
  const outputPath = path.join(__dirname, '..', 'public', 'music-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(songs, null, 2), 'utf-8');
  
  console.log(`\n✅ 音乐数据获取完成，共 ${songs.length} / ${songIds.length} 首歌`);
  console.log(`📁 保存到: ${outputPath}\n`);
  
  if (songs.length < songIds.length) {
    console.log(`⚠️  有 ${songIds.length - songs.length} 首歌获取失败，可能是网络问题或歌曲无版权`);
    console.log(`💡  可以稍后重新构建，或者换其他歌曲ID试试\n`);
  }
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
