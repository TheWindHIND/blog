import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../ToastProvider';

// 图床类型
type PicBedType = 'lsky' | 'stardots';

const PICBED_PRESETS: Record<PicBedType, { name: string; placeholder: string; tokenPlaceholder: string; desc: string }> = {
  lsky: {
    name: 'Lsky Pro',
    placeholder: '例如: https://pic.dusays.com',
    tokenPlaceholder: '输入 Bearer Token 或纯 Token',
    desc: 'Lsky Pro / 兰空图床，支持自建和第三方实例',
  },
  stardots: {
    name: 'StarDots',
    placeholder: 'https://api.stardots.io',
    tokenPlaceholder: '格式: clientKey|clientSecret',
    desc: 'StarDots 云图床，免费 5GB 存储空间',
  },
};

export default function GallerySection({ formData, handleUpdate, pushToQueue }: any) {
  const { showToast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean, msg: string } | null>(null);

  // 从 formData 推断当前图床类型
  const currentType: PicBedType = formData.picBedType || (
    formData.picBedUrl?.includes('stardots') || formData.picBedToken?.includes('|') ? 'stardots' : 'lsky'
  );

  const preset = PICBED_PRESETS[currentType];

  const handleTypeSwitch = (type: PicBedType) => {
    handleUpdate('picBedType', type);
    if (type === 'stardots') {
      handleUpdate('picBedUrl', 'https://api.stardots.io');
      handleUpdate('picBedSpace', formData.picBedSpace || 'blogimg111');
    } else {
      handleUpdate('picBedUrl', '');
    }
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    const url = formData.picBedUrl;
    const token = formData.picBedToken;

    if (!url || !token) {
      showToast("请完整填写图床 API 地址和 Token！", "warning");
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    showToast("正在向图床服务器发送校验探针...", "info");

    try {
      const configRes = await fetch(`/backend_config.json?t=${Date.now()}`);
      const configData = await configRes.json();

      const res = await fetch(`http://127.0.0.1:${configData.api_port}/api/picbed/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, token, type: currentType })
      });

      const data = await res.json();
      setTestResult({ success: data.success, msg: data.message });

      if (data.success) {
        showToast("✅ 测试通过！图床已就绪", "success");
      } else {
        showToast("❌ 认证失败或服务异常", "error");
      }
    } catch (error) {
      showToast("无法连接到本地 Python 引擎", "error");
      setTestResult({ success: false, msg: "桌面引擎连接失败，请检查终端日志" });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    if (!formData.picBedUrl || !formData.picBedToken) {
      showToast("API 地址和 Token 不能为空，无法暂存！", "error");
      return;
    }
    pushToQueue('更新图床类型', 'picBedType', currentType);
    pushToQueue('更新图床名称', 'picBedName', formData.picBedName);
    pushToQueue('更新图床 API', 'picBedUrl', formData.picBedUrl);
    pushToQueue('更新图床 Token', 'picBedToken', formData.picBedToken);
    if (currentType === 'stardots' && formData.picBedSpace) {
      pushToQueue('更新 StarDots 空间', 'picBedSpace', formData.picBedSpace);
    }
  };

  return (
    <motion.section initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/50 dark:border-slate-800/50 rounded-[40px] p-8 shadow-2xl">
      <h2 className="text-xl font-black text-slate-800 dark:text-white mb-8">🖼️ 图床引擎设置</h2>

      <div className="max-w-xl space-y-6">
        {/* 图床类型选择 */}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">图床类型</label>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(PICBED_PRESETS) as PicBedType[]).map(type => {
              const p = PICBED_PRESETS[type];
              const isActive = currentType === type;
              return (
                <button
                  key={type}
                  onClick={() => handleTypeSwitch(type)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    isActive
                      ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white/30 dark:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-black ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      {p.name}
                    </span>
                    {isActive && <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">{p.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">图床名称标识</label>
          <input
            type="text"
            value={formData.picBedName || ''}
            onChange={e => handleUpdate('picBedName', e.target.value)}
            className="w-full bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm outline-none mt-1 font-bold text-slate-700 dark:text-slate-200"
          />
        </div>

        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">API 接口地址 (URL)</label>
          <input
            type="text"
            placeholder={preset.placeholder}
            value={formData.picBedUrl || ''}
            onChange={e => handleUpdate('picBedUrl', e.target.value)}
            className="w-full bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm outline-none mt-1 text-slate-700 dark:text-slate-200"
          />
        </div>

        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
            {currentType === 'stardots' ? 'Client Key | Client Secret' : 'API Token (鉴权密钥)'}
          </label>
          <input
            type="password"
            placeholder={preset.tokenPlaceholder}
            value={formData.picBedToken || ''}
            onChange={e => handleUpdate('picBedToken', e.target.value)}
            className="w-full bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm outline-none mt-1 text-slate-700 dark:text-slate-200"
          />
          {currentType === 'stardots' && (
            <p className="text-[10px] text-slate-400 mt-1.5 ml-1">
              格式: <code className="bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded text-indigo-500 font-mono">key|secret</code>，用竖线分隔
            </p>
          )}
        </div>

        {/* StarDots 空间名 */}
        {currentType === 'stardots' && (
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">StarDots 空间名称</label>
            <input
              type="text"
              placeholder="例如: blogimg（4~15位字母或数字）"
              value={formData.picBedSpace || ''}
              onChange={e => handleUpdate('picBedSpace', e.target.value)}
              className="w-full bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm outline-none mt-1 text-slate-700 dark:text-slate-200"
            />
            <p className="text-[10px] text-slate-400 mt-1.5 ml-1">
              上传目标空间，需在 StarDots 控制台提前创建。建议设为公开空间以便图片直接访问。
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className={`flex-1 py-3 rounded-2xl text-sm font-black shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2
              ${isTesting ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-pink-500 text-white hover:bg-pink-600 shadow-pink-500/30'}`}
          >
            {isTesting ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : "📡 发送探针测试连接"}
          </button>

          <button
            onClick={handleSave}
            className="flex-1 py-3 bg-indigo-500 text-white rounded-2xl text-sm font-black shadow-lg hover:bg-indigo-600 shadow-indigo-500/30 transition-all active:scale-95"
          >
            暂存图床配置
          </button>
        </div>

        <AnimatePresence>
          {testResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className={`p-4 rounded-2xl border flex items-center gap-3 ${testResult.success ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'}`}>
                <span className="text-xl">{testResult.success ? '✅' : '❌'}</span>
                <span className="text-sm font-bold leading-relaxed">{testResult.msg}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </motion.section>
  );
}
