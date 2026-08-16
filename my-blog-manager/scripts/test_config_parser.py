# -*- coding: utf-8 -*-
"""F1 修复验证：用真实 siteConfig.ts 测试新解析器"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, r'H:\Blog\blog\my-blog-manager')
from cms_core.api.config import parse_site_config

with open(r'H:\Blog\blog\my-blog-manager\siteConfig.ts', 'r', encoding='utf-8') as f:
    content = f.read()

cfg = parse_site_config(content)

# 1. 数组字段必须存在
lm = cfg.get('localMusic', [])
print('localMusic 数量 =', len(lm), '(期望 19)')
print('cloudMusicIds =', cfg.get('cloudMusicIds'))
print('bgImages 数量 =', len(cfg.get('bgImages', [])))
print('danmakuList 数量 =', len(cfg.get('danmakuList', [])))
print('themeColors =', cfg.get('themeColors'))

# 2. 垃圾键必须不存在
bad_keys = [k for k in cfg if k.isdigit()]
print('垃圾数字键 =', bad_keys if bad_keys else '无 ✅')

# 3. 标量与对象字段抽查
print('title =', cfg.get('title'))
print('useGradient =', cfg.get('useGradient'), type(cfg.get('useGradient')).__name__)
print('counts =', cfg.get('counts'))
print('social.github =', cfg.get('social', {}).get('github'))
gt = cfg.get('gitalkConfig', {})
print('gitalkConfig.repo =', gt.get('repo'), '| admin =', gt.get('admin'))
print('geminiConfig.modelId =', cfg.get('geminiConfig', {}).get('modelId'))
dp = cfg.get('desktopPetConfig', {})
print('desktopPetConfig.petName =', dp.get('petName'))

# 4. 音乐条目字段完整性（lrc 含换行/引号/括号，是解析地狱样本）
if lm:
    s = lm[0]
    print('第一首:', s['id'], '|', s['name'], '|', s['artist'])
    print('  lrc 前40字符:', repr(s['lrc'][:40]))
    print('  neteaseId:', s.get('neteaseId'))

ok = (len(lm) == 19 and not bad_keys and isinstance(cfg.get('useGradient'), bool)
      and cfg.get('social', {}).get('github') and gt.get('admin') is not None)
print('\n结果:', '✅ 全部通过' if ok else '❌ 存在问题')
