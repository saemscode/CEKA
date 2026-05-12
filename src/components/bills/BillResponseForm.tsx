import React, { useState, useEffect } from 'react';
import { billService } from '@/services/billService';
import { useAuth } from '@/providers/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { MessageSquare, Save, Share2, CheckCircle2 } from 'lucide-react';

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
    <div className="rounded-[32px] border-none bg-white/80 dark:bg-slate-900/40 backdrop-blur-3xl shadow-ios-high dark:shadow-none dark:border dark:border-white/10 overflow-hidden">
      <div className="px-6 py-4 border-b border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-kenya-green flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          General Response
        </p>
      </div>

      <div className="p-6 space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
          Share your position on <strong className="text-slate-900 dark:text-white">{billTitle}</strong>. 
          This will be saved privately and you can optionally broadcast it to the Community Chat.
        </p>

        {submitted && (
          <div className="p-4 rounded-2xl bg-kenya-green/10 border border-kenya-green/20 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 text-kenya-green font-bold text-sm mb-1">
              <CheckCircle2 size={16} />
              Response Saved Locally
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 italic line-clamp-2">
              "{previousResponse}"
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={response}
            onChange={(e) => {
              if (e.target.value.length <= MAX_CHARS) setResponse(e.target.value);
            }}
            placeholder="Write your civic response here… (e.g. 'This bill should clarify section 3 before it proceeds to Third Reading.')"
            disabled={submitting}
            rows={5}
            className={cn(
              "w-full rounded-[24px] border-2 p-5 text-sm leading-relaxed transition-all outline-none bg-slate-100 dark:bg-white/5",
              error 
                ? "border-kenya-red/40 focus:border-kenya-red" 
                : "border-transparent focus:border-kenya-green/30"
            )}
          />

          <div className="flex justify-between items-center px-1">
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-widest",
              remaining < 100 ? "text-kenya-red" : "text-slate-400"
            )}>
              {remaining} characters remaining
            </span>
            {error && (
              <span className="text-[10px] font-bold text-kenya-red uppercase tracking-widest">{error}</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <button
              type="submit"
              disabled={submitting || !response.trim()}
              className={cn(
                "h-12 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                submitting || !response.trim()
                  ? "bg-slate-200 dark:bg-white/10 text-slate-400 cursor-not-allowed"
                  : "bg-midnight text-white hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-midnight/20"
              )}
            >
              <Save size={16} />
              {submitting ? 'Saving…' : submitted ? 'Update Response' : 'Save Response'}
            </button>

            {response.trim() && (
              <button
                type="button"
                onClick={handleShareToChat}
                className="h-12 rounded-2xl bg-white/50 dark:bg-white/5 border border-black/5 dark:border-white/10 font-bold text-xs uppercase tracking-widest hover:bg-white/80 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                <Share2 size={16} />
                Share to Community
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default BillResponseForm;
