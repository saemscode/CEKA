
import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Image,
  Link,
  Code,
  Eye,
  FileText
} from 'lucide-react';
import { blogService } from '@/services/blogService';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  postId?: string;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, postId, placeholder = "Start writing..." }: RichTextEditorProps) {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Keep track of initial content to avoid cursor jumping
  const initialContent = useRef(content || '');

  useEffect(() => {
    // If the content is updated externally (e.g. loading a post), update the editor
    if (editorRef.current && content !== editorRef.current.innerHTML && content !== initialContent.current) {
        editorRef.current.innerHTML = content;
        initialContent.current = content;
    }
  }, [content]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
        editorRef.current.focus();
        onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const media = await blogService.uploadMedia(file, postId);
      if (media) {
        const imageHtml = `<img src="${media.file_url}" alt="${media.alt_text || 'Uploaded image'}" style="max-width: 100%; height: auto; border-radius: 12px; margin: 10px 0;" />`;
        exec('insertHTML', imageHtml);
        toast({
          title: "Success",
          description: "Image uploaded successfully"
        });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [exec, postId, toast]);

  const handleAddLink = useCallback(() => {
    const url = prompt('Enter URL:');
    if (url) {
      exec('createLink', url);
    }
  }, [exec]);

  const addHeader = (level: number) => {
    exec('formatBlock', `<H${level}>`);
  };

  const toolbarButtons = [
    { icon: Bold, action: () => exec('bold'), title: 'Bold' },
    { icon: Italic, action: () => exec('italic'), title: 'Italic' },
    { icon: Underline, action: () => exec('underline'), title: 'Underline' },
    { icon: Strikethrough, action: () => exec('strikeThrough'), title: 'Strikethrough' },
    { separator: true },
    { icon: AlignLeft, action: () => exec('justifyLeft'), title: 'Align Left' },
    { icon: AlignCenter, action: () => exec('justifyCenter'), title: 'Align Center' },
    { icon: AlignRight, action: () => exec('justifyRight'), title: 'Align Right' },
    { separator: true },
    { icon: List, action: () => exec('insertUnorderedList'), title: 'Bullet List' },
    { icon: ListOrdered, action: () => exec('insertOrderedList'), title: 'Numbered List' },
    { separator: true },
    { icon: Link, action: handleAddLink, title: 'Insert Link' },
    { icon: Image, action: () => fileInputRef.current?.click(), title: 'Insert Image', disabled: isUploading },
  ];

  return (
    <Card className="w-full border-none shadow-none bg-transparent">
      <CardContent className="p-0 space-y-4">
        {/* Premium Military-Grade Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5 p-3 rounded-2xl bg-slate-900 text-white border border-slate-800 sticky top-0 z-10 shadow-xl">
          <div className="flex items-center gap-1 mr-2 px-3 py-1 bg-slate-800 rounded-xl">
            <Button variant="ghost" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => addHeader(1)} className="h-7 w-7 p-0 hover:bg-slate-700 font-black">H1</Button>
            <Button variant="ghost" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => addHeader(2)} className="h-7 w-7 p-0 hover:bg-slate-700 font-black">H2</Button>
          </div>

          <Separator orientation="vertical" className="h-6 bg-slate-700 mx-1" />

          {toolbarButtons.map((button, index) => (
            button.separator ? (
              <Separator key={index} orientation="vertical" className="h-6 bg-slate-700 mx-1" />
            ) : (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                onMouseDown={(e) => e.preventDefault()}
                onClick={button.action}
                disabled={button.disabled}
                title={button.title}
                className="h-9 w-9 p-0 hover:bg-slate-700 hover:text-white rounded-xl transition-all"
              >
                <button.icon className="h-4.5 w-4.5" />
              </Button>
            )
          ))}

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant={isPreviewMode ? "default" : "ghost"}
              size="sm"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className={cn(
                "h-9 px-4 rounded-xl font-bold transition-all border border-slate-700",
                isPreviewMode ? "bg-kenya-red hover:bg-kenya-red/90" : "hover:bg-slate-700"
              )}
            >
              {isPreviewMode ? <FileText className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {isPreviewMode ? "EDIT MODE" : "LIVE PREVIEW"}
            </Button>
          </div>
        </div>

        {/* The Canvas (Word-doc feel) */}
        <div className="relative min-h-[500px] rounded-[32px] border-2 border-slate-100 bg-white shadow-inner overflow-hidden">
          {isPreviewMode ? (
            <div className="p-12 animate-in fade-in duration-300">
              <div
                className="prose prose-slate prose-lg max-w-none 
                  prose-headings:font-black prose-headings:tracking-tighter
                  prose-h1:text-5xl prose-h2:text-4xl
                  prose-p:leading-relaxed prose-p:text-slate-600
                  prose-strong:text-slate-900 prose-strong:font-black
                  prose-a:text-kenya-green prose-a:font-bold prose-a:no-underline hover:prose-a:underline
                  prose-img:rounded-3xl prose-img:shadow-2xl"
                dangerouslySetInnerHTML={{ __html: content || '<p class="text-slate-300 italic">The canvas is blank. Awaiting CEKA...</p>' }}
              />
            </div>
          ) : (
            <div
              ref={editorRef}
              contentEditable
              onInput={handleInput}
              dangerouslySetInnerHTML={{ __html: initialContent.current }}
              className="absolute inset-0 w-full h-full p-12 overflow-y-auto focus-visible:outline-none focus:ring-0
                prose prose-slate prose-lg max-w-none 
                prose-headings:font-black prose-headings:tracking-tighter
                prose-h1:text-5xl prose-h2:text-4xl
                prose-p:leading-relaxed prose-p:text-slate-600
                prose-strong:text-slate-900 prose-strong:font-black
                prose-a:text-kenya-green prose-a:font-bold prose-a:no-underline hover:prose-a:underline
                prose-img:rounded-3xl prose-img:shadow-2xl"
              style={{ minHeight: '500px' }}
            />
          )}
        </div>

        {/* Hidden inputs */}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

        {isUploading && (
          <div className="flex items-center justify-center p-4 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100 animate-pulse font-bold text-xs">
            TRANSFUSING MEDIA TO STORAGE...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
