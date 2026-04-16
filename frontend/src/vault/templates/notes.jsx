import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FileText, Download, Copy, Check, Trash2, ChevronDown } from 'lucide-react';

// [MORZ_VAULT_TEMPLATE: notes]

const TITLE_RAW    = "{{TITLE}}";
const NOTE_TITLE   = (!TITLE_RAW || TITLE_RAW.includes('{{')) ? 'Untitled Note' : TITLE_RAW;
const CONTENT_RAW  = "{{CONTENT}}";
const NOTE_CONTENT = (!CONTENT_RAW || CONTENT_RAW.includes('{{')) ? '' : CONTENT_RAW;
const STORAGE_KEY = `morph_notes_v2_${NOTE_TITLE.replace(/\s+/g, '_').toLowerCase()}`;

function loadHtml() {
  try { return localStorage.getItem(STORAGE_KEY) || ''; } catch { return ''; }
}

function saveHtml(html) {
  try { localStorage.setItem(STORAGE_KEY, html); } catch {}
  if (typeof morphSaveState !== 'undefined') morphSaveState({ html, title: NOTE_TITLE });
}

// ── Toolbar button ──────────────────────────────────────────────────────────
function TB({ onClick, title, children }) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-white/35 hover:text-white hover:bg-white/8 transition-all select-none"
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="w-px h-3.5 bg-white/[0.07] mx-0.5 shrink-0" />;
}

export default function NotesArtifact() {
  const [title,   setTitle]   = useState(NOTE_TITLE);
  const [saved,   setSaved]   = useState(true);
  const [copied,  setCopied]  = useState(false);
  const [dlOpen,  setDlOpen]  = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [words,   setWords]   = useState(0);
  const editorRef  = useRef(null);
  const saveTimer  = useRef(null);

  // Mount: restore saved content, or pre-fill from file extraction
  useEffect(() => {
    if (!editorRef.current) return;
    const saved = loadHtml();
    if (saved) {
      editorRef.current.innerHTML = saved;
      setIsEmpty(false);
      refreshStats(editorRef.current.innerText);
    } else if (NOTE_CONTENT) {
      editorRef.current.innerText = NOTE_CONTENT;
      setIsEmpty(false);
      refreshStats(NOTE_CONTENT);
    }
    editorRef.current.focus();
  }, []);

  // Cloud restore
  useEffect(() => {
    if (typeof morphLoadState === 'undefined') return;
    morphLoadState().then(s => {
      if (s?.html && editorRef.current) {
        editorRef.current.innerHTML = s.html;
        setIsEmpty(false);
        refreshStats(editorRef.current.innerText);
      }
    }).catch(() => {});
  }, []);

  function refreshStats(text) {
    setWords(text.trim() ? text.trim().split(/\s+/).length : 0);
    setIsEmpty(!text.trim());
  }

  const onInput = () => {
    const el = editorRef.current;
    if (!el) return;
    refreshStats(el.innerText);
    setSaved(false);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveHtml(el.innerHTML);
      setSaved(true);
    }, 600);
  };

  // execCommand helpers
  const cmd = (command, value = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
  };
  const block = (tag) => {
    editorRef.current?.focus();
    document.execCommand('formatBlock', false, tag);
  };

  // ── Downloads ────────────────────────────────────────────────────────────
  const getPlainText = () => {
    const d = document.createElement('div');
    d.innerHTML = editorRef.current?.innerHTML || '';
    return d.innerText;
  };

  const dlTxt = () => {
    const blob = new Blob([`${title}\n${'─'.repeat(title.length)}\n\n${getPlainText()}`], { type: 'text/plain;charset=utf-8' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${title.replace(/\s+/g, '-').toLowerCase()}.txt` });
    a.click(); URL.revokeObjectURL(a.href); setDlOpen(false);
  };

  const dlDoc = () => {
    const wordHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${title}</title>
<style>body{font-family:Calibri,sans-serif;font-size:12pt;line-height:1.6;color:#111;}h1{font-size:20pt;font-weight:600;}h2{font-size:16pt;}h3{font-size:13pt;}ul,ol{padding-left:20pt;}li{margin-bottom:4pt;}</style>
</head><body><h1>${title}</h1>${editorRef.current?.innerHTML || ''}</body></html>`;
    const blob = new Blob(['\ufeff', wordHtml], { type: 'application/msword' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${title.replace(/\s+/g, '-').toLowerCase()}.doc` });
    a.click(); URL.revokeObjectURL(a.href); setDlOpen(false);
  };

  const dlPdf = () => {
    const frame = Object.assign(document.createElement('iframe'), {
      style: 'position:fixed;top:-9999px;left:-9999px;width:820px;height:1060px;border:none;'
    });
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><style>
      @media print { * { -webkit-print-color-adjust: exact; } }
      body { font-family: Georgia, 'Times New Roman', serif; font-size: 13pt; color: #1a1a1a; line-height: 1.75; padding: 48px; max-width: 100%; }
      h1 { font-size: 22pt; font-weight: 600; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 20px; }
      h2 { font-size: 17pt; font-weight: 500; margin-top: 28px; }
      h3 { font-size: 13pt; font-weight: 600; margin-top: 20px; }
      ul, ol { padding-left: 24px; } li { margin-bottom: 5px; }
      strong, b { font-weight: 600; } em, i { font-style: italic; }
      u { text-decoration: underline; }
    </style></head><body><h1>${title}</h1>${editorRef.current?.innerHTML || ''}</body></html>`);
    doc.close();
    setTimeout(() => {
      frame.contentWindow.focus();
      frame.contentWindow.print();
      setTimeout(() => document.body.removeChild(frame), 800);
    }, 200);
    setDlOpen(false);
  };

  const copyAll = () => {
    navigator.clipboard.writeText(getPlainText()).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  const clearNote = () => {
    if (!confirm('Clear this note?')) return;
    if (editorRef.current) editorRef.current.innerHTML = '';
    saveHtml(''); setIsEmpty(true); setWords(0);
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] text-white overflow-hidden">

      {/* Title bar */}
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-white/5 shrink-0">
        <FileText size={14} className="text-white/22 shrink-0" />
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="flex-1 bg-transparent text-sm font-light text-white/75 outline-none placeholder-white/18 min-w-0"
          placeholder="Note title..."
        />
        <span className={`text-[9px] uppercase tracking-widest shrink-0 transition-colors ${saved ? 'text-emerald-500/40' : 'text-white/15'}`}>
          {saved ? '✓ saved' : '...'}
        </span>
        <button onClick={copyAll} className="p-1.5 rounded-lg text-white/18 hover:text-white hover:bg-white/5 transition-all">
          {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
        </button>
        {/* Download menu */}
        <div className="relative shrink-0">
          <button
            onClick={() => setDlOpen(v => !v)}
            onBlur={() => setTimeout(() => setDlOpen(false), 150)}
            className="flex items-center gap-0.5 p-1.5 rounded-lg text-white/18 hover:text-white hover:bg-white/5 transition-all"
          >
            <Download size={13} />
            <ChevronDown size={9} className={`transition-transform duration-150 ${dlOpen ? 'rotate-180' : ''}`} />
          </button>
          {dlOpen && (
            <div className="absolute right-0 top-full mt-1.5 bg-[#111] border border-white/[0.07] rounded-xl overflow-hidden z-20 shadow-2xl w-28">
              {[
                { label: 'TXT', ext: '.txt', action: dlTxt },
                { label: 'DOC', ext: '.doc', action: dlDoc },
                { label: 'PDF', ext: '.pdf', action: dlPdf },
              ].map(({ label, ext, action }) => (
                <button
                  key={label}
                  onClick={action}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-white/45 hover:text-white hover:bg-white/5 transition-all"
                >
                  <span className="text-[9px] font-mono text-white/18">{ext}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={clearNote}
          className="p-1.5 rounded-lg text-white/15 hover:text-red-400 hover:bg-red-500/5 transition-all"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Formatting toolbar */}
      <div className="flex items-center flex-wrap gap-0.5 px-3 py-1.5 border-b border-white/4 bg-black/20 shrink-0">
        <TB onClick={() => cmd('bold')}      title="Bold (Ctrl+B)"><strong>B</strong></TB>
        <TB onClick={() => cmd('italic')}    title="Italic (Ctrl+I)"><em className="not-italic" style={{fontStyle:'italic'}}>I</em></TB>
        <TB onClick={() => cmd('underline')} title="Underline (Ctrl+U)"><u>U</u></TB>
        <Divider />
        <TB onClick={() => block('h1')}     title="Heading 1">H1</TB>
        <TB onClick={() => block('h2')}     title="Heading 2">H2</TB>
        <TB onClick={() => block('h3')}     title="Heading 3">H3</TB>
        <TB onClick={() => block('p')}      title="Normal paragraph">¶</TB>
        <Divider />
        <TB onClick={() => cmd('insertUnorderedList')} title="Bullet list">• List</TB>
        <TB onClick={() => cmd('insertOrderedList')}   title="Numbered list">1. List</TB>
        <Divider />
        <TB onClick={() => cmd('justifyLeft')}   title="Align left">⬡L</TB>
        <TB onClick={() => cmd('justifyCenter')} title="Center">⬡C</TB>
        <Divider />
        <TB onClick={() => cmd('removeFormat')} title="Clear formatting">Aa✕</TB>
        <TB onClick={() => cmd('undo')} title="Undo (Ctrl+Z)">↩</TB>
        <TB onClick={() => cmd('redo')} title="Redo (Ctrl+Y)">↪</TB>
      </div>

      {/* Editor */}
      <div className="flex-1 relative overflow-hidden">
        {isEmpty && (
          <p className="absolute top-6 left-8 text-white/12 text-sm font-light pointer-events-none select-none">
            Start writing…
          </p>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={onInput}
          spellCheck={false}
          className="w-full h-full overflow-y-auto px-8 py-6 outline-none text-white/75 text-sm leading-relaxed font-light"
        />
      </div>

      {/* Status bar */}
      <div className="px-6 py-2 border-t border-white/4 flex justify-between items-center text-[8px] uppercase tracking-widest text-white/12 shrink-0">
        <span>{words} word{words !== 1 ? 's' : ''}</span>
        <span>Rich Text · Morph Notes</span>
      </div>

      <style>{`
        [contenteditable] h1 { font-size: 1.55em; font-weight: 300; margin: 0.8em 0 0.3em; color: rgba(255,255,255,0.92); line-height: 1.25; }
        [contenteditable] h2 { font-size: 1.25em; font-weight: 300; margin: 0.8em 0 0.25em; color: rgba(255,255,255,0.85); border-bottom: 1px solid rgba(255,255,255,0.04); padding-bottom: 4px; }
        [contenteditable] h3 { font-size: 1.05em; font-weight: 500; margin: 0.7em 0 0.2em; color: rgba(255,255,255,0.8); }
        [contenteditable] p  { margin: 0.25em 0; }
        [contenteditable] ul { list-style: disc; padding-left: 1.5em; margin: 0.4em 0; }
        [contenteditable] ol { list-style: decimal; padding-left: 1.5em; margin: 0.4em 0; }
        [contenteditable] li { margin-bottom: 0.2em; }
        [contenteditable] b, [contenteditable] strong { font-weight: 600; color: rgba(255,255,255,0.92); }
        [contenteditable] i, [contenteditable] em     { color: rgba(255,255,255,0.62); }
        [contenteditable] u  { text-underline-offset: 3px; }
      `}</style>
    </div>
  );
}
