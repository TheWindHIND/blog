import { motion } from 'framer-motion';
import { Save, Users, Eye, ToggleLeft, ToggleRight } from 'lucide-react';
import { useToast } from '../ToastProvider';

interface VisitorCounterSectionProps {
  formData: any;
  handleUpdate: (field: string, value: any) => void;
  pushToQueue: (label: string, key?: string, value?: any) => void;
}

const iconOptions = [
  { value: '👥', label: '人群' },
  { value: '👁️', label: '眼睛' },
  { value: '🚶', label: '行人' },
  { value: '📊', label: '统计' },
  { value: '✨', label: '星星' },
];

export default function VisitorCounterSection({ formData, handleUpdate, pushToQueue }: VisitorCounterSectionProps) {
  const { showToast } = useToast();
  const config = formData.visitorCounter || { enabled: true, icon: '👥', position: 'bottom-right' };

  const toggleEnabled = () => {
    handleUpdate('visitorCounter', { ...config, enabled: !config.enabled });
    showToast(config.enabled ? '访客统计已关闭' : '访客统计已开启', 'success');
  };

  const selectIcon = (icon: string) => {
    handleUpdate('visitorCounter', { ...config, icon });
    showToast('图标已更换', 'success');
  };

  const saveToQueue = () => {
    pushToQueue('访客统计设置', 'visitorCounter', config);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col gap-6"
    >
      <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/50 dark:border-slate-800/50 rounded-[40px] p-8 shadow-xl">
        <div className="flex justify-between items-center mb-8 border-b border-white/30 dark:border-slate-700/50 pb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
              <Users className="text-indigo-500" /> 访客统计
            </h2>
            <p className="text-slate-500 text-sm mt-1 font-bold">管理右下角的访客人数统计小胶囊</p>
          </div>
          <button
            onClick={saveToQueue}
            className="px-6 py-3 bg-indigo-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-indigo-500/30 flex items-center gap-2 hover:bg-indigo-600 transition-colors"
          >
            <Save size={16} /> 保存修改
          </button>
        </div>

        <div className="space-y-8">
          {/* 开关 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye size={20} className="text-slate-500" />
              <span className="font-bold text-slate-700 dark:text-slate-200">启用访客统计</span>
            </div>
            <button
              onClick={toggleEnabled}
              className="text-indigo-500 hover:text-indigo-600 transition-colors"
            >
              {config.enabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
            </button>
          </div>

          {/* 图标选择 */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-200 mb-3">选择图标</label>
            <div className="flex flex-wrap gap-3">
              {iconOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => selectIcon(option.value)}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all ${
                    config.icon === option.value
                      ? 'bg-indigo-500 text-white shadow-lg scale-110'
                      : 'bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-700 border border-white/40 dark:border-slate-700/50'
                  }`}
                  title={option.label}
                >
                  {option.value}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
