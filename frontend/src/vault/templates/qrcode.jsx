import React, { useState, useEffect } from 'react';
import { Download, Copy, Check, QrCode, Link } from 'lucide-react';

// [MORZ_VAULT_TEMPLATE: qrcode]

export default function QRCodeGenerator() {
  const [input,   setInput]   = useState('https://morphos.ai');
  const [qrSrc,   setQrSrc]   = useState('');
  const [copied,  setCopied]  = useState(false);

  // Debounced QR generation
  useEffect(() => {
    if (!input.trim()) { setQrSrc(''); return; }
    const t = setTimeout(() => {
      setQrSrc(`https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=16&color=ffffff&bgcolor=0a0a0a&data=${encodeURIComponent(input)}`);
    }, 400);
    return () => clearTimeout(t);
  }, [input]);

  const copy = () => {
    navigator.clipboard.writeText(input).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const download = () => {
    const link = document.createElement('a');
    link.href = qrSrc.replace('280x280', '600x600');
    link.download = 'qrcode.png';
    link.target = '_blank';
    link.click();
  };

  return (
    <div className="h-full bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 gap-6">
      <div className="w-full max-w-xs space-y-5">

        {/* Header */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center mx-auto mb-3">
            <QrCode size={22} className="text-blue-400" />
          </div>
          <h2 className="text-white/80 font-light text-lg">QR Generator</h2>
          <p className="text-white/25 text-xs mt-1">URL, text, anything</p>
        </div>

        {/* QR display */}
        <div className="w-full aspect-square bg-white/3 border border-white/8 rounded-3xl flex items-center justify-center overflow-hidden">
          {qrSrc ? (
            <img src={qrSrc} alt="QR Code" className="w-full h-full object-contain rounded-3xl" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-white/15">
              <QrCode size={40} />
              <p className="text-xs">Enter text to generate</p>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 bg-white/4 border border-white/10 focus-within:border-white/20 rounded-2xl px-4 py-3 transition-colors">
          <Link size={13} className="text-white/25 shrink-0" />
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Enter URL or text..."
            className="flex-1 bg-transparent text-sm text-white placeholder-white/20 outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={copy}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 border rounded-xl text-sm transition-all active:scale-95 ${
              copied ? 'bg-emerald-500/12 border-emerald-500/20 text-emerald-400' : 'bg-white/4 border-white/8 text-white/50 hover:text-white hover:bg-white/8'
            }`}>
            {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
          </button>
          <button onClick={download} disabled={!qrSrc}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-500/12 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl text-blue-400 text-sm transition-all active:scale-95 disabled:opacity-30">
            <Download size={13} /> Save PNG
          </button>
        </div>
      </div>
    </div>
  );
}
