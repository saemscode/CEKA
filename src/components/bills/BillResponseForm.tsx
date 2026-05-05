import React, { useState, useEffect } from 'react';
import { billService } from '@/services/billService';
import { useAuth } from '@/providers/AuthProvider';
import { useNavigate } from 'react-router-dom';

interface BillResponseFormProps {
  billId: string;
  billTitle: string;
  /** Called when the user submits so the parent can show a success state. */
  onSubmitSuccess?: (responseText: string) => void;
}

const MAX_CHARS = 1500;

export const BillResponseForm: React.FC<BillResponseFormProps> = ({
  billId,
  billTitle,
  onSubmitSuccess,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [response, setResponse] = useState('');
  const [previousResponse, setPreviousResponse] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remaining = MAX_CHARS - response.length;

  useEffect(() => {
    if (!user || !billId) return;
    billService.getUserBillResponse(billId).then((r) => {
      if (r) {
        setPreviousResponse(r);
        setResponse(r);
      }
    });
  }, [user, billId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/auth?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    if (!response.trim()) {
      setError('Response cannot be empty.');
      return;
    }
    setSubmitting(true);
    setError(null);

    const ok = await billService.submitBillResponse(billId, response.trim());
    setSubmitting(false);

    if (ok) {
      setSubmitted(true);
      setPreviousResponse(response.trim());
      onSubmitSuccess?.(response.trim());
    } else {
      setError('Could not save your response. Please try again.');
    }
  };

  const handleShareToChat = () => {
    const params = new URLSearchParams({
      bill_id: billId,
      response_text: encodeURIComponent(response.trim()),
    });
    navigate(`/community?${params.toString()}`);
  };

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 16,
        padding: '20px 22px',
        backdropFilter: 'blur(12px)',
      }}
    >
      <p
        style={{
          margin: '0 0 8px',
          fontSize: 13,
          color: 'rgba(255,255,255,0.45)',
          letterSpacing: 0.3,
          textTransform: 'uppercase',
        }}
      >
        🏛️ Your Response
      </p>
      <p
        style={{
          margin: '0 0 14px',
          fontSize: 14,
          color: 'rgba(255,255,255,0.70)',
          lineHeight: 1.5,
        }}
      >
        Share your position on <strong style={{ color: '#fff' }}>{billTitle}</strong>. This will be
        saved privately and you can optionally broadcast it to the Community Chat.
      </p>

      {submitted ? (
        <div
          style={{
            padding: '14px 16px',
            borderRadius: 12,
            background: 'rgba(0,200,100,0.12)',
            border: '1px solid rgba(0,200,100,0.25)',
            marginBottom: 12,
          }}
        >
          <p style={{ margin: 0, color: '#00e676', fontWeight: 600, fontSize: 14 }}>
            ✅ Response saved!
          </p>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.60)', fontSize: 13 }}>
            {previousResponse}
          </p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit}>
        <textarea
          value={response}
          onChange={(e) => {
            if (e.target.value.length <= MAX_CHARS) setResponse(e.target.value);
          }}
          placeholder="Write your civic response here… (e.g. 'This bill should clarify section 3 before it proceeds to Third Reading.')"
          disabled={submitting}
          rows={5}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.06)',
            border: `1px solid ${error ? 'rgba(255,100,100,0.4)' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: 10,
            padding: '12px 14px',
            color: '#fff',
            fontSize: 14,
            lineHeight: 1.6,
            resize: 'vertical',
            outline: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'rgba(130,180,255,0.5)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = error ? 'rgba(255,100,100,0.4)' : 'rgba(255,255,255,0.12)';
          }}
        />

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 6,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: remaining < 100 ? '#ff7043' : 'rgba(255,255,255,0.35)',
            }}
          >
            {remaining} chars remaining
          </span>
          {error && (
            <span style={{ fontSize: 12, color: '#ff5252' }}>{error}</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button
            type="submit"
            disabled={submitting || !response.trim()}
            style={{
              flex: 1,
              padding: '11px 20px',
              background:
                submitting || !response.trim()
                  ? 'rgba(255,255,255,0.08)'
                  : 'linear-gradient(135deg, #1565C0 0%, #0288D1 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 14,
              cursor: submitting || !response.trim() ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s, transform 0.15s',
            }}
            onMouseDown={(e) => {
              if (!submitting && response.trim()) {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)';
              }
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            {submitting ? '⏳ Saving…' : submitted ? '✏️ Update Response' : '💾 Save Response'}
          </button>

          {response.trim() && (
            <button
              type="button"
              onClick={handleShareToChat}
              style={{
                padding: '11px 16px',
                background: 'rgba(255,255,255,0.07)',
                color: 'rgba(255,255,255,0.85)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              💬 Share to Community
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default BillResponseForm;
