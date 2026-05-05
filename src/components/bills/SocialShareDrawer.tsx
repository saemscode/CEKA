import React, { useState, useEffect } from 'react';
import socialService, { SocialTemplate } from '@/services/socialService';

interface SocialShareDrawerProps {
  billId: string;
  billTitle: string;
  billStatus?: string;
  /** Optional user-written response to merge into templates */
  userResponse?: string;
  isOpen: boolean;
  onClose: () => void;
}

const PLATFORM_META: Record<string, { icon: string; label: string; color: string }> = {
  twitter: { icon: '🐦', label: 'Twitter / X', color: '#1DA1F2' },
  whatsapp: { icon: '💬', label: 'WhatsApp', color: '#25D366' },
  instagram: { icon: '📸', label: 'Instagram', color: '#E1306C' },
  general: { icon: '🔗', label: 'General Copy', color: '#8B5CF6' },
};

export const SocialShareDrawer: React.FC<SocialShareDrawerProps> = ({
  billId,
  billTitle,
  billStatus,
  userResponse,
  isOpen,
  onClose,
}) => {
  const [templates, setTemplates] = useState<SocialTemplate[]>([]);
  const [activePlatform, setActivePlatform] = useState<string>('whatsapp');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    socialService
      .getTemplates(billId, billTitle, billStatus)
      .then((t) => {
        setTemplates(t);
        if (t.length > 0) setActivePlatform(t[0].platform);
      })
      .finally(() => setLoading(false));
  }, [billId, billTitle, billStatus, isOpen]);

  const activeTemplate = templates.find((t) => t.platform === activePlatform);
  const mergedText = activeTemplate
    ? socialService.mergeResponseIntoTemplate(activeTemplate.template, userResponse)
    : '';

  const handleShare = async () => {
    if (!mergedText) return;
    if (activePlatform === 'instagram') {
      await socialService.share(mergedText, 'instagram');
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } else {
      await socialService.share(
        mergedText,
        activePlatform as 'twitter' | 'whatsapp' | 'general',
        `https://ceka.co.ke/bills/${billId}`
      );
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(mergedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(6px)',
          zIndex: 9998,
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: 'linear-gradient(180deg, #0f1117 0%, #0a0c11 100%)',
          borderTop: '1px solid rgba(255,255,255,0.10)',
          borderRadius: '22px 22px 0 0',
          padding: '0 20px 32px',
          animation: 'slideUp 0.3s cubic-bezier(0.22, 0.61, 0.36, 1)',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div style={{ textAlign: 'center', padding: '14px 0 10px' }}>
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.20)',
              display: 'inline-block',
            }}
          />
        </div>

        <h3 style={{ margin: '0 0 4px', color: '#fff', fontSize: 17, fontWeight: 700 }}>
          📣 Share to the World
        </h3>
        <p style={{ margin: '0 0 18px', color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
          Spread the word on {billTitle}
        </p>

        {/* Platform tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {(['twitter', 'whatsapp', 'instagram', 'general'] as const).map((p) => {
            const meta = PLATFORM_META[p];
            return (
              <button
                key={p}
                onClick={() => setActivePlatform(p)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 20,
                  border: `1.5px solid ${activePlatform === p ? meta.color : 'rgba(255,255,255,0.12)'}`,
                  background:
                    activePlatform === p
                      ? `${meta.color}22`
                      : 'rgba(255,255,255,0.04)',
                  color: activePlatform === p ? meta.color : 'rgba(255,255,255,0.60)',
                  fontSize: 13,
                  fontWeight: activePlatform === p ? 700 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {meta.icon} {meta.label}
              </button>
            );
          })}
        </div>

        {/* Template preview */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,255,255,0.4)' }}>
            ⏳ Loading templates…
          </div>
        ) : (
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 12,
              padding: '14px 16px',
              marginBottom: 14,
              minHeight: 100,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 13.5,
                lineHeight: 1.7,
                color: 'rgba(255,255,255,0.80)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {mergedText || 'No template available for this platform.'}
            </p>
          </div>
        )}

        {activePlatform === 'instagram' && (
          <p style={{ fontSize: 12, color: 'rgba(255,160,80,0.8)', margin: '0 0 10px' }}>
            📌 Instagram doesn't support direct web sharing. Text will be copied to your clipboard — then paste it in your app.
          </p>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleShare}
            disabled={!mergedText}
            style={{
              flex: 1,
              padding: '12px 20px',
              background: PLATFORM_META[activePlatform]?.color || '#6366F1',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 14,
              cursor: mergedText ? 'pointer' : 'not-allowed',
              opacity: mergedText ? 1 : 0.5,
              transition: 'opacity 0.2s, transform 0.15s',
            }}
            onMouseDown={(e) => {
              if (mergedText) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)';
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            {activePlatform === 'instagram'
              ? copied
                ? '✅ Copied!'
                : '📋 Copy for Instagram'
              : `✈️ Share on ${PLATFORM_META[activePlatform]?.label}`}
          </button>

          <button
            onClick={handleCopy}
            title="Copy text to clipboard"
            style={{
              padding: '12px 18px',
              background: 'rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.80)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12,
              fontSize: 18,
              cursor: 'pointer',
            }}
          >
            {copied ? '✅' : '📋'}
          </button>
        </div>

        <style>{`
          @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
          @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
      </div>
    </>
  );
};

export default SocialShareDrawer;
