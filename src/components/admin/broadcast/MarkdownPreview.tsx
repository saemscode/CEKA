import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent } from '@/components/ui/card';

interface MarkdownPreviewProps {
    content: string;
    subject: string;
}

export const MarkdownPreview = ({ content, subject }: MarkdownPreviewProps) => {
    return (
        <Card className="glass-card border-0 shadow-ios h-full overflow-hidden flex flex-col">
            <div className="bg-muted/50 p-4 border-b border-white/5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Email Subject</p>
                <p className="font-bold text-sm">{subject || 'Untitled Broadcast'}</p>
            </div>
            <CardContent className="flex-1 overflow-y-auto p-6 prose prose-sm dark:prose-invert max-w-none prose-headings:font-black prose-headings:tracking-tighter prose-hr:border-white/10">
                <ReactMarkdown>
                    {content || '*No content composed yet. Start typing to see the preview...*'}
                </ReactMarkdown>
            </CardContent>
            <div className="p-4 bg-muted/30 text-[10px] text-muted-foreground text-center border-t border-white/5">
                © {new Date().getFullYear()} CEKA Community • Civic Education Kenya Alliance
            </div>
        </Card>
    );
};
