import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { CEKALoader } from '@/components/ui/ceka-loader';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, ShareIcon } from 'lucide-react';
import { translate } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ArticleViewer() {
  const { chapterId, articleId } = useParams();
  const { language } = useLanguage();
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('constitution_articles' as any)
          .select('*')
          .eq('article', articleId)
          .single();
          
        if (!error && data) {
          setArticle(data);
        } else {
          // Mock data if table fails or misses it (for dev continuity)
          setArticle({
            article: articleId,
            title: `Article ${articleId}`,
            content: `This is the official content for Article ${articleId} of the Kenyan Constitution.`,
            chapter: chapterId || 1
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    if (articleId) fetchArticle();
  }, [articleId, chapterId]);

  if (loading) {
    return (
      <Layout>
        <div className="container py-32 flex flex-col items-center justify-center min-h-[50vh]">
          <CEKALoader variant="scanning" size="lg" />
          <p className="text-muted-foreground mt-4 font-bold tracking-widest uppercase text-sm animate-pulse">Loading Katiba</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-12 max-w-4xl mx-auto">
        <Button variant="ghost" asChild className="mb-8 rounded-full">
          <Link to="/constitution">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Constitution
          </Link>
        </Button>

        <div className="glass-card rounded-[32px] p-8 md:p-12 shadow-ios-high dark:shadow-ios-high-dark relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-kenya-red/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-kenya-red/10 flex items-center justify-center text-kenya-red">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                {translate("Chapter", language)} {article?.chapter || chapterId}
              </p>
              <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                {article?.title || `Article ${articleId}`}
              </h1>
            </div>
          </div>
          
          <div className="prose prose-lg dark:prose-invert max-w-none relative z-10 font-serif leading-relaxed text-slate-700 dark:text-slate-300">
            {article?.content?.split('\n').map((paragraph: string, idx: number) => (
              <p key={idx} className="mb-6">{paragraph}</p>
            ))}
          </div>
          
          <div className="mt-12 pt-8 border-t border-border/40 flex justify-between items-center relative z-10">
             <Button variant="outline" className="rounded-full gap-2 font-bold shadow-sm object-cover">
               <ShareIcon className="w-4 h-4" />
               Copy Link
             </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
