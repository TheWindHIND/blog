"use client";

import React, { useState, useImperativeHandle, forwardRef, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';

// Markdown 插件
import { Markdown } from 'tiptap-markdown';

// C++ 语法高亮
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight, all } from 'lowlight';

import {
  Undo2, Redo2, Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, List, ListOrdered, ListTodo,
  Highlighter, Code2, Heading1, Heading2, Heading3,
  Type, ImageIcon, Quote, RemoveFormatting, ChevronDown,
  Pipette, Hash, Check, Link2, Superscript as SupIcon, Subscript as SubIcon, Palette, Lock
} from 'lucide-react';

const lowlight = createLowlight(all);

/* ================================================================
 * TipTap 扩展
 * ================================================================ */
const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '100%',
        renderHTML: attributes => ({
          style: `width: ${attributes.width}; height: auto; display: block; margin: 2rem auto; border-radius: 2rem; box-shadow: 0 20px 50px rgba(0,0,0,0.15);`
        })
      }
    };
  },
});

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() { return { types: ['textStyle'] }; },
  addGlobalAttributes() { return [{ types: this.options.types, attributes: { fontSize: { default: null, parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ''), renderHTML: attributes => attributes.fontSize ? { style: `font-size: ${attributes.fontSize}` } : {} } } }]; },
  addCommands() { return { setFontSize: (fontSize: string) => ({ chain }) => chain().setMark('textStyle', { fontSize }).run() }; },
});

/* ================================================================
 * 颜色转换工具
 * ================================================================ */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): [number, number, number] {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function isValidHex(hex: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);
}

/* ================================================================
 * 扩展调色板 — 48 色（6 行 × 8 列）
 * ================================================================ */
const EXTENDED_PALETTE = [
  // Row 1: 灰阶
  '#000000', '#1F2937', '#374151', '#4B5563', '#6B7280', '#9CA3AF', '#D1D5DB', '#FFFFFF',
  // Row 2: 红/橙
  '#7F1D1D', '#991B1B', '#DC2626', '#EF4444', '#F87171', '#FCA5A5', '#FEE2E2', '#FFF5F5',
  // Row 3: 黄/琥珀
  '#78350F', '#92400E', '#D97706', '#F59E0B', '#FCD34D', '#FDE68A', '#FEF3C7', '#FFFBEB',
  // Row 4: 绿/翡翠
  '#064E3B', '#065F46', '#059669', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#ECFDF5',
  // Row 5: 蓝/靛
  '#1E1B4B', '#1E3A5F', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#EFF6FF',
  // Row 6: 紫/粉
  '#4C1D95', '#5B21B6', '#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#F5F3FF',
];

/* ================================================================
 * HSL 色盘组件（可拖动）
 * ================================================================ */
const HSLColorWheel = ({ hue, saturation, lightness, onHueChange, onSLChange }: {
  hue: number; saturation: number; lightness: number;
  onHueChange: (h: number) => void;
  onSLChange: (s: number, l: number) => void;
}) => {
  const slCanvasRef = useRef<HTMLCanvasElement>(null);
  const hueBarRef = useRef<HTMLDivElement>(null);
  const slBarRef = useRef<HTMLDivElement>(null);
  const isDraggingSL = useRef(false);
  const isDraggingHue = useRef(false);

  // 绘制饱和度/亮度面板
  useEffect(() => {
    const canvas = slCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width = 256;
    const h = canvas.height = 160;

    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        const s = (x / w) * 100;
        const l = 100 - (y / h) * 100;
        ctx.fillStyle = `hsl(${hue}, ${s}%, ${l}%)`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }, [hue]);

  const handleSLPointer = useCallback((e: React.PointerEvent | PointerEvent) => {
    const rect = slBarRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    onSLChange(Math.round(x * 100), Math.round((1 - y) * 100));
  }, [onSLChange]);

  const handleHuePointer = useCallback((e: React.PointerEvent | PointerEvent) => {
    const rect = hueBarRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    onHueChange(Math.round(y * 360));
  }, [onHueChange]);

  const handleSLDown = (e: React.PointerEvent) => {
    isDraggingSL.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handleSLPointer(e);
  };

  const handleHueDown = (e: React.PointerEvent) => {
    isDraggingHue.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handleHuePointer(e);
  };

  const handleSLMove = (e: React.PointerEvent) => {
    if (isDraggingSL.current) handleSLPointer(e);
  };

  const handleHueMove = (e: React.PointerEvent) => {
    if (isDraggingHue.current) handleHuePointer(e);
  };

  const handleSLEnd = () => { isDraggingSL.current = false; };
  const handleHueEnd = () => { isDraggingHue.current = false; };

  // SL 指针位置
  const slX = (saturation / 100) * 100;
  const slY = ((100 - lightness) / 100) * 100;

  return (
    <div className="flex gap-3 items-stretch">
      {/* 饱和度/亮度面板 */}
      <div
        ref={slBarRef}
        className="relative w-[200px] h-[140px] rounded-xl overflow-hidden cursor-crosshair border border-white/20 shadow-inner"
        onPointerDown={handleSLDown}
        onPointerMove={handleSLMove}
        onPointerUp={handleSLEnd}
        onPointerCancel={handleSLEnd}
      >
        <canvas ref={slCanvasRef} className="w-full h-full" style={{ imageRendering: 'pixelated' }} />
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white shadow-lg pointer-events-none"
          style={{
            left: `${slX}%`,
            top: `${slY}%`,
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 0 1.5px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.4)',
          }}
        />
      </div>

      {/* 色相条 */}
      <div
        ref={hueBarRef}
        className="relative w-[18px] h-[140px] rounded-full overflow-hidden cursor-pointer border border-white/20 shadow-inner"
        style={{
          background: 'linear-gradient(to bottom, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
        }}
        onPointerDown={handleHueDown}
        onPointerMove={handleHueMove}
        onPointerUp={handleHueEnd}
        onPointerCancel={handleHueEnd}
      >
        <div
          className="absolute left-0 right-0 h-1.5 bg-white rounded-full shadow-md pointer-events-none border border-black/20"
          style={{
            top: `${(hue / 360) * 100}%`,
            transform: 'translateY(-50%)',
          }}
        />
      </div>
    </div>
  );
};

/* ================================================================
 * 增强版颜色选择器（HSL 色盘 + 扩展调色板 + 手动输入）
 * ================================================================ */
const EnhancedColorPicker = ({ activeColor, onSelect, onConfirm, recentColors, onClose, title }: any) => {
  const [hex, setHex] = useState(activeColor || '#6366F1');
  const [hsl, setHsl] = useState<[number, number, number]>(() => hexToHsl(activeColor || '#6366F1'));
  const [inputHex, setInputHex] = useState((activeColor || '#6366F1').replace('#', ''));
  const [mode, setMode] = useState<'wheel' | 'palette'>('palette');

  const syncFromHex = useCallback((newHex: string) => {
    setHex(newHex);
    setInputHex(newHex.replace('#', ''));
    setHsl(hexToHsl(newHex));
    onSelect(newHex);
  }, [onSelect]);

  const handleHueChange = useCallback((h: number) => {
    setHsl(prev => {
      const newHsl: [number, number, number] = [h, prev[1], prev[2]];
      const newHex = hslToHex(...newHsl);
      setHex(newHex);
      setInputHex(newHex.replace('#', ''));
      onSelect(newHex);
      return newHsl;
    });
  }, [onSelect]);

  const handleSLChange = useCallback((s: number, l: number) => {
    setHsl(prev => {
      const newHsl: [number, number, number] = [prev[0], s, l];
      const newHex = hslToHex(...newHsl);
      setHex(newHex);
      setInputHex(newHex.replace('#', ''));
      onSelect(newHex);
      return newHsl;
    });
  }, [onSelect]);

  const handleInputChange = (val: string) => {
    setInputHex(val);
    const fullHex = '#' + val;
    if (isValidHex(fullHex)) {
      syncFromHex(fullHex);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[9990] bg-slate-900/20 dark:bg-black/40 backdrop-blur-sm transition-all" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl rounded-[28px] p-5 shadow-2xl border border-white/40 dark:border-white/10 z-[9999] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col gap-4">
          {/* 标题栏 */}
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title || 'Color'}</span>
            <div className="flex items-center gap-2">
              <div className="flex bg-black/5 dark:bg-white/5 rounded-lg p-0.5">
                <button
                  onClick={() => setMode('palette')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${mode === 'palette' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  调色板
                </button>
                <button
                  onClick={() => setMode('wheel')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${mode === 'wheel' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  色盘
                </button>
              </div>
              <button onClick={() => onConfirm(hex)} className="w-7 h-7 flex items-center justify-center bg-indigo-500 text-white rounded-full hover:scale-110 transition-transform">
                <Check size={14} />
              </button>
            </div>
          </div>

          {/* 预览色块 */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl border border-white/20 shadow-md" style={{ backgroundColor: hex }} />
            <div className="flex-1 flex items-center gap-2 bg-black/5 dark:bg-white/5 p-2.5 rounded-xl border border-white/10 shadow-inner">
              <Hash size={12} className="text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={inputHex.toUpperCase()}
                onChange={(e) => handleInputChange(e.target.value)}
                className="bg-transparent w-full text-xs font-black outline-none uppercase text-slate-800 dark:text-slate-200 tracking-wider"
                maxLength={6}
              />
            </div>
          </div>

          {/* 色盘模式 / 调色板模式 */}
          {mode === 'wheel' ? (
            <HSLColorWheel
              hue={hsl[0]}
              saturation={hsl[1]}
              lightness={hsl[2]}
              onHueChange={handleHueChange}
              onSLChange={handleSLChange}
            />
          ) : (
            <div className="grid grid-cols-8 gap-1.5">
              {EXTENDED_PALETTE.map(c => (
                <button
                  key={c}
                  onClick={() => syncFromHex(c)}
                  className={`w-full aspect-square rounded-lg border transition-all hover:scale-110 hover:shadow-md ${
                    hex.toUpperCase() === c.toUpperCase() ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 scale-110' : 'border-white/20'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          )}

          {/* 最近使用 */}
          {recentColors && recentColors.length > 0 && (
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/50 dark:border-white/10">
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Recent</span>
              <div className="flex flex-wrap gap-1.5">
                {recentColors.map((c: string) => (
                  <button
                    key={c}
                    onClick={() => syncFromHex(c)}
                    className={`w-5 h-5 rounded-full border shadow-sm hover:scale-125 transition-transform ${
                      hex.toUpperCase() === c.toUpperCase() ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-900' : 'border-white/40'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

/* ================================================================
 * Tooltip 组件
 * ================================================================ */
const Tooltip = ({ children, text, shortcut }: { children: React.ReactNode; text: string; shortcut?: string }) => {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleEnter = () => {
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setPos({
          x: rect.left + rect.width / 2,
          y: rect.top - 8,
        });
      }
      setShow(true);
    }, 400);
  };

  const handleLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShow(false);
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        className="inline-flex"
      >
        {children}
      </div>
      {show && (
        <div
          className="fixed z-[10000] pointer-events-none animate-in fade-in duration-150"
          style={{
            left: pos.x,
            top: pos.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-[11px] font-medium rounded-lg shadow-xl whitespace-nowrap flex items-center gap-2">
            <span>{text}</span>
            {shortcut && (
              <span className="px-1.5 py-0.5 bg-white/20 rounded text-[9px] font-bold">{shortcut}</span>
            )}
          </div>
          <div className="w-2 h-2 bg-slate-900 dark:bg-slate-700 rotate-45 mx-auto -mt-1" />
        </div>
      )}
    </>
  );
};

/* ================================================================
 * 导出接口
 * ================================================================ */
export interface RichTextEditorHandle {
  insertImage: (url: string) => void;
  insertImages: (urls: string[]) => void;
  getContent: () => string;
}

interface EditorProps {
  title: string;
  setTitle: (val: string) => void;
  titleColor?: string;
  setTitleColor?: (color: string) => void;
  initialContent?: string;
  onOpenImageTool: () => void;
  isTitleLocked?: boolean;
  onChange?: () => void;
}

/* ================================================================
 * 主编辑器组件
 * ================================================================ */
const RichTextEditor = forwardRef<RichTextEditorHandle, EditorProps>(({
  title, setTitle, titleColor, setTitleColor, initialContent, onOpenImageTool, isTitleLocked, onChange
}, ref) => {
  const [textColors, setTextColors] = useState<string[]>(['#6366F1', '#000000']);
  const [highlightColors, setHighlightColors] = useState<string[]>(['#FEF08A', '#BBF7D0']);
  const [showTextPicker, setShowTextPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showTitleColorPicker, setShowTitleColorPicker] = useState(false);
  const [titleColors, setTitleColors] = useState<string[]>(['#6366F1', '#EC4899']);

  const loadedContentRef = useRef<string | null>(null);
  const [, setRenderTrigger] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'cpp',
        HTMLAttributes: {
          class: 'bg-[#282c34] text-[#abb2bf] p-6 rounded-[1.5rem] font-mono my-6 overflow-x-auto shadow-inner'
        },
      }),
      Underline, Subscript, Superscript, TextStyle, Color, FontSize, CustomImage,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-indigo-500 underline cursor-pointer font-bold' } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      TaskList.configure({ HTMLAttributes: { class: 'not-prose space-y-3' } }),
      TaskItem.configure({ nested: true }),
    ],
    content: initialContent || '',
    immediatelyRender: false,
    onUpdate: () => {
      if (onChange) onChange();
    },
    onTransaction: () => {
      setRenderTrigger(v => v + 1);
    },
    editorProps: {
      attributes: { class: 'prose prose-slate dark:prose-invert prose-lg max-w-none w-full focus:outline-none min-h-full pb-60 font-serif leading-relaxed px-4 editor-content-area' }
    },
  });

  useImperativeHandle(ref, () => ({
    insertImage: (url: string) => {
      if (editor) {
        editor.chain().focus().setImage({ src: url }).run();
        if (onChange) onChange();
      }
    },
    insertImages: (urls: string[]) => {
      if (editor) {
        let chain = editor.chain().focus();
        urls.forEach(url => { chain = chain.setImage({ src: url }); });
        chain.run();
        if (onChange) onChange();
      }
    },
    getContent: () => {
      if (!editor) return '';
      let html = editor.getHTML();
      html = html.replace(/<p><\/p>/gi, '<br>&zwj;');
      html = html.replace(/<p><br><\/p>/gi, '<br>&zwj;');
      return html;
    }
  }), [editor, onChange]);

  useEffect(() => {
    if (!editor || !initialContent) return;
    if (loadedContentRef.current !== initialContent) {
      const safeContent = initialContent.replace(/~~([\s\S]*?)~~/g, '<s>$1</s>');
      editor.commands.setContent(safeContent, { emitUpdate: false });
      loadedContentRef.current = initialContent;
    }
  }, [editor, initialContent]);

  if (!editor) return null;

  const currentFontSize = editor.getAttributes('textStyle').fontSize || "default";

  const toggleLink = () => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const previousUrl = editor.getAttributes('link').href || '';
    const url = window.prompt('请输入跳转链接 (URL):', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    const safeUrl = /^https?:\/\//.test(url) ? url : `https://${url}`;
    editor.chain().focus().extendMarkRange('link').setLink({ href: safeUrl }).run();
  };

  /* 带 Tooltip 的按钮 */
  const Btn = ({ onClick, active, children, title, tooltip, shortcut }: any) => (
    <Tooltip text={tooltip || title || ''} shortcut={shortcut}>
      <button
        onClick={onClick}
        title={title}
        className={`p-2.5 rounded-xl transition-all duration-300 ease-out flex items-center justify-center 
          ${active ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/40 scale-110' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'}`}
      >
        {children}
      </button>
    </Tooltip>
  );

  return (
    <div className="flex flex-col h-full w-full min-h-0 bg-transparent relative">
      <style dangerouslySetInnerHTML={{ __html: `
        .editor-content-area h1 { font-size: 3rem !important; font-weight: 950 !important; margin-bottom: 2rem !important; margin-top: 3rem !important; line-height: 1.1; color: inherit; } 
        .editor-content-area h2 { font-size: 2.2rem !important; font-weight: 800 !important; margin-bottom: 1.5rem !important; margin-top: 2rem !important; } 
        .editor-content-area h3 { font-size: 1.5rem !important; font-weight: 700 !important; margin-bottom: 1rem !important; } 
        .editor-content-area p { font-size: 1.15rem !important; line-height: 1.85 !important; } 
        .editor-content-area ul { list-style-type: disc !important; padding-left: 1.5rem !important; } 
        .editor-content-area ol { list-style-type: decimal !important; padding-left: 1.5rem !important; }
        
        .editor-content-area s, .editor-content-area del { text-decoration-line: line-through !important; opacity: 0.6; }

        .editor-content-area blockquote {
          border-left: 4px solid #6366f1 !important;
          background-color: rgba(99, 102, 241, 0.05) !important;
          padding: 1rem 1.5rem !important;
          margin: 1.5rem 0 !important;
          border-radius: 0 1.25rem 1.25rem 0 !important;
          font-style: italic !important;
          color: #64748b !important;
        }
        .editor-content-area blockquote p {
          margin: 0 !important; 
          color: inherit !important;
        }
        .dark .editor-content-area blockquote {
          border-left-color: #818cf8 !important;
          background-color: rgba(129, 140, 248, 0.1) !important;
          color: #94a3b8 !important;
        }

        .editor-content-area pre code, .editor-content-area p code {
          font-family: ui-rounded, 'Quicksand', 'Nunito', 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Source Code Pro', Menlo, Monaco, Consolas, monospace !important;
          font-variant-ligatures: contextual !important;
          font-weight: 500 !important;
          letter-spacing: 0.02em !important;
        }
        
        .editor-content-area p code {
           background-color: rgba(99, 102, 241, 0.1) !important; color: #6366f1 !important; padding: 0.2rem 0.4rem !important; border-radius: 0.5rem !important; font-size: 0.85em !important;
        }

        .editor-content-area pre code .hljs-comment, .editor-content-area pre code .hljs-quote { color: #5c6370; font-style: italic; }
        .editor-content-area pre code .hljs-doctag, .editor-content-area pre code .hljs-keyword, .editor-content-area pre code .hljs-formula { color: #c678dd; }
        .editor-content-area pre code .hljs-keyword.type_, .editor-content-area pre code .hljs-type { color: #c678dd; } 
        .editor-content-area pre code .hljs-section, .editor-content-area pre code .hljs-name, .editor-content-area pre code .hljs-selector-tag, .editor-content-area pre code .hljs-deletion, .editor-content-area pre code .hljs-subst { color: #e06c75; }
        .editor-content-area pre code .hljs-literal { color: #56b6c2; }
        .editor-content-area pre code .hljs-string, .editor-content-area pre code .hljs-regexp, .editor-content-area pre code .hljs-addition, .editor-content-area pre code .hljs-attribute, .editor-content-area pre code .hljs-meta-string { color: #98c379; }
        .editor-content-area pre code .hljs-built_in, .editor-content-area pre code .hljs-class .hljs-title, .editor-content-area pre code .hljs-title.class_ { color: #e6c07b; } 
        .editor-content-area pre code .hljs-attr, .editor-content-area pre code .hljs-variable, .editor-content-area pre code .hljs-template-variable, .editor-content-area pre code .hljs-selector-class, .editor-content-area pre code .hljs-selector-attr, .editor-content-area pre code .hljs-selector-pseudo, .editor-content-area pre code .hljs-number { color: #d19a66; }
        .editor-content-area pre code .hljs-symbol, .editor-content-area pre code .hljs-bullet, .editor-content-area pre code .hljs-link, .editor-content-area pre code .hljs-meta, .editor-content-area pre code .hljs-selector-id, .editor-content-area pre code .hljs-title, .editor-content-area pre code .hljs-title.function_ { color: #61aeee; } 
      `}} />

      {/* ===== 标题区域 ===== */}
      <div className="shrink-0 px-12 pt-14 pb-4 flex items-center gap-4">
        <input
          type="text"
          value={title}
          onChange={(e) => !isTitleLocked && setTitle(e.target.value)}
          readOnly={isTitleLocked}
          placeholder="文章大标题..."
          style={titleColor ? { color: titleColor } : undefined}
          className={`flex-1 text-5xl font-black bg-transparent border-none outline-none transition-all tracking-tighter 
            ${isTitleLocked ? 'text-slate-400 dark:text-slate-600 cursor-default select-none' : 'text-slate-900 dark:text-white placeholder:text-slate-200 dark:placeholder:text-slate-800'}
          `}
        />
        {/* 标题颜色选择按钮 */}
        {setTitleColor && !isTitleLocked && (
          <Tooltip text="设置标题文字颜色">
            <button
              onClick={() => setShowTitleColorPicker(true)}
              className="flex items-center gap-2 px-3 py-2 bg-black/5 dark:bg-white/5 rounded-xl border border-white/10 hover:bg-black/10 dark:hover:bg-white/10 transition-all"
            >
              <div className="w-5 h-5 rounded-lg border border-white/20 shadow-sm" style={{ backgroundColor: titleColor || '#6366F1' }} />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">标题色</span>
            </button>
          </Tooltip>
        )}
        {isTitleLocked && (
          <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center gap-2 text-slate-400 border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-right duration-500">
            <Lock size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">System Locked</span>
          </div>
        )}
      </div>

      {/* ===== 工具栏 ===== */}
      <div className="shrink-0 px-8 py-2.5 border-y border-white/20 dark:border-white/10 flex flex-wrap items-center gap-1.5 bg-white/10 dark:bg-black/20 backdrop-blur-md z-50">
        {/* 撤销/重做/清除格式 */}
        <div className="flex items-center gap-1">
          <Btn onClick={() => editor.chain().focus().undo().run()} tooltip="撤销" shortcut="Ctrl+Z">
            <Undo2 size={16} />
          </Btn>
          <Btn onClick={() => editor.chain().focus().redo().run()} tooltip="重做" shortcut="Ctrl+Y">
            <Redo2 size={16} />
          </Btn>
          <Btn onClick={() => editor.chain().focus().unsetAllMarks().run()} tooltip="清除所有格式">
            <RemoveFormatting size={16} />
          </Btn>
        </div>
        <div className="w-px h-6 bg-slate-400/20 mx-1" />

        {/* 字号选择 */}
        <Tooltip text="设置文字大小">
          <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 rounded-xl px-2">
            <ChevronDown size={12} className="text-slate-400" />
            <select
              value={currentFontSize}
              onChange={(e) => {
                editor.chain().focus().setFontSize(e.target.value).run();
              }}
              className="bg-transparent text-[10px] font-black p-2 outline-none text-slate-700 dark:text-slate-300"
            >
              <option value="default" disabled>字号</option>
              {['14px', '16px', '18px', '20px', '24px', '32px', '48px'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </Tooltip>

        {/* 标题/正文 */}
        <div className="flex items-center gap-1">
          <Btn onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive('paragraph') && !editor.isActive('heading')} tooltip="正文段落" shortcut="Ctrl+Alt+0">
            <Type size={18} />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} tooltip="一级标题" shortcut="Ctrl+Alt+1">
            <div className="flex items-center gap-1 font-black"><Heading1 size={16} /><span className="text-[10px] opacity-60">#</span></div>
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} tooltip="二级标题" shortcut="Ctrl+Alt+2">
            <div className="flex items-center gap-1 font-black"><Heading2 size={16} /><span className="text-[10px] opacity-60">##</span></div>
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} tooltip="三级标题" shortcut="Ctrl+Alt+3">
            <div className="flex items-center gap-1 font-black"><Heading3 size={16} /><span className="text-[10px] opacity-60">###</span></div>
          </Btn>
        </div>

        <div className="w-px h-6 bg-slate-400/20 mx-1" />

        {/* 文字格式 */}
        <div className="flex items-center gap-1">
          <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} tooltip="加粗" shortcut="Ctrl+B">
            <Bold size={16} />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} tooltip="斜体" shortcut="Ctrl+I">
            <Italic size={16} />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} tooltip="下划线" shortcut="Ctrl+U">
            <UnderlineIcon size={16} />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} tooltip="删除线" shortcut="Ctrl+Shift+X">
            <Strikethrough size={16} />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} tooltip="代码块" shortcut="Ctrl+Alt+C">
            <Code2 size={16} />
          </Btn>
        </div>

        <div className="w-px h-6 bg-slate-400/20 mx-1" />

        {/* 对齐 */}
        <div className="flex items-center gap-1">
          <Btn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} tooltip="左对齐">
            <AlignLeft size={16} />
          </Btn>
          <Btn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} tooltip="居中对齐">
            <AlignCenter size={16} />
          </Btn>
          <Btn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} tooltip="右对齐">
            <AlignRight size={16} />
          </Btn>
        </div>

        <div className="w-px h-6 bg-slate-400/20 mx-1" />

        {/* 列表/引用 */}
        <div className="flex items-center gap-1">
          <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} tooltip="无序列表">
            <List size={16} />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} tooltip="有序列表">
            <ListOrdered size={16} />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} tooltip="任务清单（复选框）">
            <ListTodo size={16} />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} tooltip="引用块">
            <Quote size={16} />
          </Btn>
        </div>

        <div className="w-px h-6 bg-slate-400/20 mx-1" />

        {/* 上标/下标/链接/图片 */}
        <div className="flex items-center gap-1">
          <Btn onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive('superscript')} tooltip="上标（如数学公式 x²）">
            <SupIcon size={16} />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive('subscript')} tooltip="下标（如化学式 H₂O）">
            <SubIcon size={16} />
          </Btn>
          <Btn onClick={toggleLink} active={editor.isActive('link')} tooltip="插入/编辑超链接" shortcut="Ctrl+K">
            <Link2 size={16} />
          </Btn>
          <Btn onClick={onOpenImageTool} tooltip="插入图片（支持批量上传）">
            <ImageIcon size={16} className="text-indigo-500" />
          </Btn>
        </div>

        {/* 图片尺寸选择器 */}
        {editor.isActive('image') && (
          <div className="flex items-center gap-1 ml-4 bg-indigo-500/10 p-1 px-3 rounded-2xl border border-indigo-500/20 border-dashed animate-in slide-in-from-left">
            {['25%', '50%', '75%', '100%'].map(s => (
              <Tooltip key={s} text={`设置图片宽度为 ${s}`}>
                <button
                  onClick={() => editor.chain().focus().updateAttributes('image', { width: s }).run()}
                  className="px-2 py-1 text-[9px] font-bold hover:bg-white rounded-lg transition-all"
                >
                  {s}
                </button>
              </Tooltip>
            ))}
          </div>
        )}

        <div className="flex-1" />

        {/* ===== 文字颜色 & 高亮颜色 ===== */}
        <div className="flex items-center gap-4">
          {/* 文字颜色 */}
          <Tooltip text="设置选中文字的颜色">
            <div className="relative">
              <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1.5 px-3 rounded-2xl border border-white/10 shadow-inner">
                <Palette size={14} className="text-slate-400 mr-2" />
                <div className="flex items-center gap-1 pr-2 border-r border-white/10">
                  {textColors.map(c => (
                    <button
                      key={c}
                      onClick={() => editor.chain().focus().setColor(c).run()}
                      onContextMenu={(e) => { e.preventDefault(); setTextColors(prev => prev.filter(col => col !== c)); }}
                      className="w-4 h-4 rounded-full border border-white/40 hover:scale-125 transition-all shadow-sm"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
                <button onClick={() => { setShowTextPicker(true); setShowHighlightPicker(false); setShowTitleColorPicker(false); }} className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center border border-indigo-500/30 ml-1">
                  <Pipette size={14} className="text-indigo-500" />
                </button>
              </div>
            </div>
          </Tooltip>

          {/* 高亮颜色 */}
          <Tooltip text="高亮标记选中文字（荧光笔效果）">
            <div className="relative">
              <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1.5 px-3 rounded-2xl border border-white/10 shadow-inner">
                <Highlighter size={14} className="text-slate-400 mr-2" />
                <div className="flex items-center gap-1 pr-2 border-r border-white/10">
                  {highlightColors.map(c => (
                    <button
                      key={c}
                      onClick={() => editor.chain().focus().setHighlight({ color: c }).run()}
                      onContextMenu={(e) => { e.preventDefault(); setHighlightColors(prev => prev.filter(col => col !== c)); }}
                      className="w-4 h-4 rounded-md border border-white/40 hover:scale-125 transition-all shadow-sm"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
                <button onClick={() => { setShowHighlightPicker(true); setShowTextPicker(false); setShowTitleColorPicker(false); }} className="w-8 h-8 rounded-xl bg-yellow-400 shadow-xl flex items-center justify-center border border-white/20 ml-1">
                  <Highlighter size={14} className="text-white" />
                </button>
              </div>
            </div>
          </Tooltip>
        </div>
      </div>

      {/* ===== 颜色选择器弹窗 ===== */}
      {showTextPicker && (
        <EnhancedColorPicker
          title="Text Color"
          activeColor="#6366F1"
          recentColors={textColors}
          onClose={() => setShowTextPicker(false)}
          onSelect={(c: string) => editor.chain().focus().setColor(c).run()}
          onConfirm={(c: string) => {
            if (!textColors.includes(c)) setTextColors(p => [c, ...p].slice(0, 8));
            setShowTextPicker(false);
          }}
        />
      )}
      {showHighlightPicker && (
        <EnhancedColorPicker
          title="Highlight Color"
          activeColor="#FEF08A"
          recentColors={highlightColors}
          onClose={() => setShowHighlightPicker(false)}
          onSelect={(c: string) => editor.chain().focus().setHighlight({ color: c }).run()}
          onConfirm={(c: string) => {
            if (!highlightColors.includes(c)) setHighlightColors(p => [c, ...p].slice(0, 8));
            setShowHighlightPicker(false);
          }}
        />
      )}
      {showTitleColorPicker && (
        <EnhancedColorPicker
          title="Title Color"
          activeColor={titleColor || '#6366F1'}
          recentColors={titleColors}
          onClose={() => setShowTitleColorPicker(false)}
          onSelect={(c: string) => setTitleColor?.(c)}
          onConfirm={(c: string) => {
            if (!titleColors.includes(c)) setTitleColors(p => [c, ...p].slice(0, 8));
            setTitleColor?.(c);
            setShowTitleColorPicker(false);
          }}
        />
      )}

      {/* ===== 编辑区 ===== */}
      <div className="flex-1 overflow-y-auto px-12 py-12 custom-scrollbar">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';
export default RichTextEditor;
