import React from 'react';
import { useNavigate } from 'react-router-dom';

interface BillCardAttachmentProps {
  billId: string;
  billTitle: string;
  billStatus?: string;
  billSummary?: string;
  /** Corroboration score 0-100 */
  corroborationScore?: number;
  userResponseExcerpt?: string;
}

const STATUS_COLORS: Record<string, string> = {
  'First Reading': '#42A5F5',
  'Second Reading': '#66BB6A',
  'Committee Stage': '#FFA726',
  'Third Reading': '#AB47BC',
  'Presidential Assent': '#EF5350',
  Enacted: '#26C6DA',
  'Public Feedback': '#26A69A',
};

export const BillCardAttachment: React.FC<BillCardAttachmentProps> = ({
  billId,
  billTitle,
  billStatus,
  billSummary,
  corroborationScore,
  userResponseExcerpt,
}) => {
  const navigate = useNavigate();
  const statusColor = billStatus ? (STATUS_COLORS[billStatus] || '#8B92A5') : '#8B92A5';

  return (
    <div
      onClick={() => navigate(`/bills/${billId}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/bills/${billId}`)}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 14,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'background 0.2s, transform 0.15s',
        maxWidth: 440,
        backdropFilter: 'blur(10px)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.07)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <span
          style={{
            fontSize: 20,
            lineHeight: 1,
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          🏛️
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 700,
              color: '#fff',
              lineHeight: 1.4,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {billTitle}
          </p>

          {billStatus && (
            <span
              style={{
                display: 'inline-block',
                marginTop: 5,
                padding: '2px 8px',
                borderRadius: 20,
                background: `${statusColor}22`,
                border: `1px solid ${statusColor}44`,
                color: statusColor,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 0.3,
              }}
            >
              {billStatus}
            </span>
          )}
        </div>

        {/* Corroboration score badge */}
        {corroborationScore !== undefined && (
          <div
            style={{
              flexShrink: 0,
              textAlign: 'center',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 10,
              padding: '4px 8px',
              minWidth: 44,
            }}
          >
            <span
              style={{
                display: 'block',
                fontSize: 15,
                fontWeight: 800,
                color:
                  corroborationScore >= 70
                    ? '#00e676'
                    : corroborationScore >= 40
                    ? '#FFD54F'
                    : '#FF7043',
              }}
            >
              {Math.round(corroborationScore)}
            </span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.2 }}>
              SCORE
            </span>
          </div>
        )}
      </div>

      {/* Summary */}
      {billSummary && (
        <p
          style={{
            margin: '0 0 8px',
            fontSize: 12.5,
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.6,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {billSummary}
        </p>
      )}

      {/* User's shared response excerpt */}
      {userResponseExcerpt && (
        <div
          style={{
            borderLeft: '2px solid rgba(130,180,255,0.4)',
            paddingLeft: 10,
            marginTop: 8,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: 'rgba(130,180,255,0.80)',
              fontStyle: 'italic',
              lineHeight: 1.5,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            "{userResponseExcerpt}"
          </p>
        </div>
      )}

      {/* CTA */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: 10,
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: 'rgba(130,160,255,0.70)',
            fontWeight: 600,
            letterSpacing: 0.3,
          }}
        >
          View full report →
        </span>
      </div>
    </div>
  );
};

export default BillCardAttachment;
