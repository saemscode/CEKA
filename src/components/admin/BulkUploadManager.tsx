// BulkUploadManager.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { unzipSync } from 'fflate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
    Upload, Folder, File as FileIcon, X, CheckCircle, XCircle, Clock, RefreshCw,
    Image, FileText, Music, Video, Archive, Trash2, Eye, Edit3, Save, Plus, ExternalLink, Settings, Zap,
    ChevronDown, PlusCircle, AlertTriangle, Link2, DownloadCloud, Globe
} from 'lucide-react';
import { Link } from 'react-router-dom';
import backblazeStorage from '@/services/backblazeStorage';
import { supabase } from '@/integrations/supabase/client';
import { mediaService, MediaContent } from '@/services/mediaService';
import { CEKALoader } from '@/components/ui/ceka-loader';

const CF_VISION_URL = 'https://ceka-vision-extract.saemscodes.workers.dev';
const CF_VALIDATOR_URL = 'https://ceka-extraction-validator.saemscodes.workers.dev';
const CF_TRANSLATOR_URL = 'https://ceka-translation-draft.saemscodes.workers.dev';

interface UploadFile {
    id: string;
    file: File;
    name: string;
    size: number;
    type: string;
    status: 'pending' | 'uploading' | 'success' | 'error' | 'staged';
    progress: number;
    url?: string;
    error?: string;
    stagedTitle: string;
    stagedDescription: string;
    stagedTags: string;
    base64?: string;
    extracted?: any;
    translationDraft?: string | null;
    confidence?: number;
    validatorDecision?: string;
    orderIndex?: number;
    dbId?: string;
    storagePath?: string;
    variantPaths?: string[];
    storageProviderUsed?: 'b2' | 'supabase';
    regModeUsed?: RegistrationMode;
    carouselId?: string;
}

type RegistrationMode = 'storage_only' | 'resource' | 'carousel_item';

const STORAGE_FOLDERS = [
    { value: 'resources', label: 'Resource Library' },
    { value: 'carousels', label: 'Carousels' },
    { value: 'documents', label: 'Documents' },
    { value: 'media', label: 'Media' },
    { value: 'legislation', label: 'Legislation' }
];

interface CarouselInfo {
    title: string;
    description: string;
    tags: string;
    slug: string;
}

const CATEGORIES = [
    { value: 'general', label: 'General' },
    { value: 'constitution', label: 'Constitution' },
    { value: 'legislation', label: 'Legislation' },
    { value: 'reports', label: 'Reports' },
    { value: 'education', label: 'Education' },
    { value: 'media', label: 'Media' }
];

const IMG_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
const isImg = (n: string) => IMG_EXTS.some(e => n.toLowerCase().endsWith(e));
const ZIP_MIME = 'application/zip';
const isZip = (f: File) => f.type === ZIP_MIME || f.name.toLowerCase().endsWith('.zip');

const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

const BulkUploadManager = () => {
    const [files, setFiles] = useState<UploadFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [targetFolder, setTargetFolder] = useState('resources');
    const [customFolder, setCustomFolder] = useState('');
    const [regMode, setRegMode] = useState<RegistrationMode>('carousel_item');
    const [category, setCategory] = useState('general');
    const [selectedCarousel, setSelectedCarousel] = useState<string>('');
    const [isCreatingNewCarousel, setIsCreatingNewCarousel] = useState(false);
    const [isInstantPublish, setIsInstantPublish] = useState(true);
    const [carouselInfo, setCarouselInfo] = useState<CarouselInfo>({
        title: '',
        description: '',
        tags: '',
        slug: ''
    });
    const [sharedMetadata, setSharedMetadata] = useState({
        title: '',
        description: '',
        tags: ''
    });
    const [useSharedMetadata, setUseSharedMetadata] = useState(true);
    const [storageProvider, setStorageProvider] = useState<'b2' | 'supabase'>('b2');
    const [carousels, setCarousels] = useState<MediaContent[]>([]);
    const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});
    const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set());
    const [deletingCarousel, setDeletingCarousel] = useState<string | null>(null);
    const [archivingCarousel, setArchivingCarousel] = useState<Set<string>>(new Set());
    const [backblazeReady, setBackblazeReady] = useState<boolean | null>(null);

    // URL Auto-Extraction States
    const [socialUrl, setSocialUrl] = useState('');
    const [extractionEngine, setExtractionEngine] = useState<'apify' | 'sociavault' | 'opengraph'>('apify');
    const [extractingUrl, setExtractingUrl] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        checkBackblaze();
        fetchCarousels();
    }, []);

    const handleExtractSocialUrl = async () => {
        if (!socialUrl.trim()) {
            toast({ title: 'Enter a valid URL', description: 'Paste an Instagram post URL or media link.', variant: 'destructive' });
            return;
        }

        setExtractingUrl(true);
        try {
            const isInstagram = socialUrl.includes('instagram.com');
            let extractedTitle = 'Civic Education Post';
            let extractedDesc = '';
            let extractedTags: string[] = ['civic', 'kenya', 'education'];
            let mediaUrls: string[] = [];

            if (isInstagram) {
                const match = socialUrl.match(/\/p\/([A-Za-z0-9_-]+)/) || socialUrl.match(/\/reel\/([A-Za-z0-9_-]+)/);
                const postCode = match ? match[1] : 'post';
                extractedTitle = `Instagram Post (${postCode})`;
                extractedDesc = `Ingested automatically via ${extractionEngine.toUpperCase()} API from ${socialUrl}`;

                try {
                    const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(socialUrl)}`);
                    if (res.ok) {
                        const json = await res.json();
                        const data = json.data;
                        if (data?.title) extractedTitle = data.title;
                        if (data?.description) extractedDesc = data.description;
                        if (data?.image?.url) mediaUrls.push(data.image.url);
                    }
                } catch (e) {
                    console.warn('[URLExtractor] Microlink fetch failed, falling back to raw HTML parsing:', e);
                }

                // Fallback: If Microlink failed to get the image (very common for IG)
                if (mediaUrls.length === 0) {
                    try {
                        const fallbackRes = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(socialUrl)}`);
                        if (fallbackRes.ok) {
                            const json = await fallbackRes.json();
                            const html = json.contents;
                            if (html) {
                                const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
                                if (ogImageMatch && ogImageMatch[1]) {
                                    // Make sure it's a valid URL, decode HTML entities
                                    const imgUrl = ogImageMatch[1].replace(/&amp;/g, '&');
                                    mediaUrls.push(imgUrl);
                                }
                                const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
                                if (ogTitleMatch && ogTitleMatch[1]) extractedTitle = ogTitleMatch[1].replace(/&amp;/g, '&');
                                
                                const ogDescMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i);
                                if (ogDescMatch && ogDescMatch[1]) extractedDesc = ogDescMatch[1].replace(/&amp;/g, '&');
                            }
                        }
                    } catch (fallbackErr) {
                        console.warn('[URLExtractor] Fallback extraction failed:', fallbackErr);
                    }
                }

                const hashtags = extractedDesc.match(/#[a-zA-Z0-9_]+/g);
                if (hashtags?.length) {
                    extractedTags = hashtags.map(h => h.replace('#', '').toLowerCase());
                }
            } else {
                try {
                    const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(socialUrl)}`);
                    if (res.ok) {
                        const json = await res.json();
                        const data = json.data;
                        if (data?.title) extractedTitle = data.title;
                        if (data?.description) extractedDesc = data.description;
                        if (data?.image?.url) mediaUrls.push(data.image.url);
                    }
                } catch (e) {
                    console.warn('[URLExtractor] Microlink fetch failed for non-IG:', e);
                }
            }

            const cleanTitle = extractedTitle.substring(0, 80);
            const cleanSlug = cleanTitle.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') || `post-${Date.now()}`;

            setCarouselInfo({
                title: cleanTitle,
                description: extractedDesc,
                tags: extractedTags.join(', '),
                slug: cleanSlug
            });

            setRegMode('carousel_item');
            setIsCreatingNewCarousel(true);

            if (mediaUrls.length > 0) {
                const newFiles: UploadFile[] = await Promise.all(
                    mediaUrls.map(async (url, idx) => {
                        let blob: Blob;
                        try {
                            // Use a CORS proxy to bypass Instagram CDN blocking
                            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
                            const res = await fetch(proxyUrl);
                            if (!res.ok) throw new Error("CORS Proxy failed");
                            blob = await res.blob();
                        } catch (e) {
                            throw new Error(`Failed to download image from ${url}`);
                        }
                        const mime = blob.type || 'image/jpeg';
                        const file = new File([blob], `slide_${idx + 1}.jpg`, { type: mime });
                        const base64 = await fileToBase64(file);
                        return {
                            id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2)}`,
                            file,
                            name: file.name,
                            size: blob.size,
                            type: mime,
                            status: 'staged',
                            progress: 0,
                            stagedTitle: `${cleanTitle} - Slide ${idx + 1}`,
                            stagedDescription: extractedDesc,
                            stagedTags: extractedTags.join(', '),
                            base64,
                        };
                    })
                );
                setFiles(prev => [...prev, ...newFiles]);
            } else {
                throw new Error("No images could be extracted from this URL.");
            }

            toast({
                title: 'Post Extracted Successfully!',
                description: `Parsed metadata & slides from ${socialUrl}. Ready for 1-click publishing!`
            });
            setSocialUrl('');
        } catch (err: any) {
            toast({ title: 'Extraction failed', description: err.message || 'Could not parse post URL.', variant: 'destructive' });
        } finally {
            setExtractingUrl(false);
        }
    };

    const checkBackblaze = async () => {
        try {
            const ready = await backblazeStorage.initialize();
            setBackblazeReady(ready);
        } catch (error) {
            setBackblazeReady(false);
        }
    };

    const fetchCarousels = async () => {
        try {
            const data = await mediaService.listMediaContent('carousel');
            setCarousels(data);
        } catch (error) {
            console.error('Failed to fetch carousels:', error);
        }
    };

    const deleteEntireCarousel = async (carouselId: string) => {
        setDeletingCarousel(carouselId);
        try {
            const { data: items, error: fetchErr } = await (supabase.from('media_items' as any) as any)
                .select('*')
                .eq('content_id', carouselId);
            if (fetchErr) throw fetchErr;

            for (const item of items || []) {
                const meta = item.metadata || {};
                const fileName = item.file_path;
                const base = fileName.substring(0, fileName.lastIndexOf('.'));
                const ext = fileName.split('.').pop();
                const variantPaths = [fileName];
                const qualities = meta.qualities || [];
                if (qualities.includes('320p')) variantPaths.push(`${base}_320p.${ext}`);
                if (qualities.includes('720p')) variantPaths.push(`${base}_720p.${ext}`);
                if (qualities.includes('1080p')) variantPaths.push(`${base}_1080p.${ext}`);
                if (item.storage_provider === 'supabase' || !item.storage_provider) {
                    await supabase.storage.from('resources').remove(variantPaths);
                } else {
                    for (const path of variantPaths) {
                        await backblazeStorage.deleteFile(path);
                    }
                }
            }

            await (supabase.from('media_items' as any) as any)
                .delete()
                .eq('content_id', carouselId);

            await (supabase as any)
                .from('translation_units')
                .delete()
                .eq('carousel_id', carouselId);

            await (supabase.from('media_content' as any) as any)
                .delete()
                .eq('id', carouselId);

            setFiles(prev => prev.filter(f => f.carouselId !== carouselId));

            if (selectedCarousel === carouselId) {
                setSelectedCarousel('');
            }

            await fetchCarousels();

            window.dispatchEvent(new CustomEvent('carousel-deleted', { detail: { carouselId } }));

            toast({ title: 'Carousel Deleted', description: 'The entire carousel and all its items have been permanently removed.' });
        } catch (err: any) {
            toast({ title: 'Deletion failed', description: err.message, variant: 'destructive' });
        } finally {
            setDeletingCarousel(null);
        }
    };

    const archiveCarousel = async (carouselId: string, currentStatus: string) => {
        setArchivingCarousel(prev => new Set(prev).add(carouselId));
        try {
            const newStatus = currentStatus === 'archived' ? 'published' : 'archived';
            await (supabase as any).from('media_content').update({ status: newStatus }).eq('id', carouselId);
            await fetchCarousels();
            toast({ title: newStatus === 'archived' ? 'Archived' : 'Published', description: 'Carousel status updated.' });
        } catch (err: any) {
            toast({ title: 'Action failed', description: err.message, variant: 'destructive' });
        } finally {
            setArchivingCarousel(prev => {
                const next = new Set(prev);
                next.delete(carouselId);
                return next;
            });
        }
    };

    const confirmDeleteCarousel = (carouselId: string) => {
        const carousel = carousels.find(c => c.id === carouselId);
        const name = carousel ? carousel.title : 'this carousel';
        toast({
            title: `Delete ${name}?`,
            description: 'This will permanently remove all images, metadata, and the carousel itself. This cannot be undone.',
            variant: 'destructive',
            action: (
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteEntireCarousel(carouselId)}
                    className="ml-2"
                >
                    Delete
                </Button>
            ),
        });
    };

    const ingestZip = async (file: File) => {
        try {
            const buf = await file.arrayBuffer();
            const unzipped = unzipSync(new Uint8Array(buf));
            const entries = Object.entries(unzipped)
                .filter(([name]) => isImg(name))
                .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));

            if (!entries.length) {
                toast({ title: 'No images in ZIP', variant: 'destructive' });
                return;
            }

            const zipBase = file.name.replace(/\.zip$/i, '').replace(/[-_]/g, ' ');
            const cleanTitle = zipBase
                .split(' ')
                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');
            const cleanSlug = cleanTitle.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

            if (regMode === 'carousel_item' && files.length === 0) {
                setCarouselInfo({ title: cleanTitle, slug: cleanSlug, description: '', tags: '' });
                setIsCreatingNewCarousel(true);
            }

            const newFiles: UploadFile[] = await Promise.all(entries.map(async ([name, bytes], idx) => {
                const ext = name.split('.').pop()?.toLowerCase() || 'jpg';
                const mime = ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png' : 'image/jpeg';
                const base64 = await blobToBase64(new Blob([bytes], { type: mime }));
                return {
                    id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2)}`,
                    file: new File([bytes], name, { type: mime }),
                    name: name.split('/').pop() || name,
                    size: bytes.length,
                    type: mime,
                    status: 'staged',
                    progress: 0,
                    stagedTitle: name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
                    stagedDescription: '',
                    stagedTags: '',
                    base64,
                    extracted: null,
                    translationDraft: null,
                };
            }));

            setFiles(prev => [...prev, ...newFiles]);
        } catch (err: any) {
            toast({ title: 'ZIP extraction failed', description: err.message, variant: 'destructive' });
        }
    };

    const handleFilesSelected = useCallback(async (selectedFiles: FileList | null) => {
        if (!selectedFiles) return;
        const fileArray = Array.from(selectedFiles);

        if (regMode === 'carousel_item' && files.length === 0 && fileArray.length > 0) {
            const firstFile = fileArray[0];
            const pathParts = (firstFile as any).webkitRelativePath?.split('/');
            const rawName = pathParts && pathParts.length > 1
                ? pathParts[0]
                : firstFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

            const cleanTitle = rawName
                .split(' ')
                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');

            const cleanSlug = cleanTitle.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

            setCarouselInfo(prev => ({ ...prev, title: cleanTitle, slug: cleanSlug }));
            setIsCreatingNewCarousel(true);
        }

        if (regMode === 'carousel_item' && (files.length + fileArray.length) > 20) {
            toast({
                title: 'Limit Reached',
                description: 'Carousels are limited to 20 images for optimal performance.',
                variant: 'destructive'
            });
            return;
        }

        const newFiles: UploadFile[] = await Promise.all(fileArray.map(async (file) => {
            const base64 = await fileToBase64(file);
            return {
                id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                file,
                name: file.name,
                size: file.size,
                type: file.type,
                status: 'staged',
                progress: 0,
                stagedTitle: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
                stagedDescription: '',
                stagedTags: '',
                base64,
                extracted: null,
                translationDraft: null,
            };
        }));

        setFiles(prev => [...prev, ...newFiles]);
    }, [files.length, regMode, toast]);

    const processEntry = async (entry: any): Promise<File[]> => {
        if (entry.isFile) {
            return new Promise((resolve) => {
                entry.file((file: File) => resolve([file]));
            });
        } else if (entry.isDirectory) {
            const dirReader = entry.createReader();
            const entries = await new Promise<any[]>((resolve) => {
                dirReader.readEntries((results: any) => resolve(results));
            });
            const files = await Promise.all(entries.map(processEntry));
            return files.flat();
        }
        return [];
    };

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        const dt = e.dataTransfer;
        
        let allFiles: File[] = [];
        
        if (dt.items && dt.items.length > 0) {
            const promises = Array.from(dt.items).map(item => {
                if (item.webkitGetAsEntry) {
                    const entry = item.webkitGetAsEntry();
                    if (entry) return processEntry(entry);
                }
                return item.getAsFile() ? [item.getAsFile() as File] : [];
            });
            const results = await Promise.all(promises);
            allFiles = results.flat().filter(Boolean);
        } else {
            allFiles = Array.from(dt.files);
        }

        const zips = allFiles.filter(isZip);
        // Exclude system files and unsupported formats from auto-staging
        const others = allFiles.filter(f => !isZip(f) && f.name !== '.DS_Store' && f.name.indexOf('._') !== 0);

        for (const zip of zips) await ingestZip(zip);
        if (others.length > 0) handleFilesSelected(others as unknown as FileList);
    }, [ingestZip, handleFilesSelected]);

    const onFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files;
        if (!selectedFiles) return;
        const filesArray = Array.from(selectedFiles);
        const zips = filesArray.filter(isZip);
        const others = filesArray.filter(f => !isZip(f));

        for (const zip of zips) await ingestZip(zip);
        if (others.length > 0) handleFilesSelected(others as unknown as FileList);
    };

    const updateStagedFile = (id: string, updates: Partial<UploadFile>) => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const churnImage = async (file: File, quality: '320p' | '720p' | '1080p'): Promise<File> => {
        return new Promise((resolve, reject) => {
            const img = new window.Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                const targetHeight = quality === '320p' ? 320 : quality === '720p' ? 720 : 1080;

                if (height > targetHeight) {
                    const ratio = targetHeight / height;
                    width = Math.round(width * ratio);
                    height = targetHeight;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) return reject('Canvas context failed');

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (!blob) return reject('Blob creation failed');
                    const extension = file.name.split('.').pop();
                    const baseName = file.name.replace(/\.[^/.]+$/, '');
                    const newFile = new File([blob], `${baseName}_${quality}.${extension}`, {
                        type: file.type,
                        lastModified: Date.now()
                    });
                    resolve(newFile);
                }, file.type, 0.92);
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    };

    const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
        return new Promise((resolve) => {
            const img = new window.Image();
            img.onload = () => {
                const dims = { width: img.width, height: img.height };
                URL.revokeObjectURL(img.src);
                resolve(dims);
            };
            img.src = URL.createObjectURL(file);
        });
    };

    const runVisionPipelineForSlide = async (file: UploadFile, carouselId: string, totalFiles: number) => {
        if (!file.type.startsWith('image/') || !file.base64) return;
        try {
            const vRes = await fetch(CF_VISION_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image_base64: file.base64,
                    slide_number: (file.orderIndex ?? 0) + 1,
                    total_slides: totalFiles,
                    is_final: (file.orderIndex ?? 0) + 1 === totalFiles
                }),
            });
            const vData = await vRes.json();
            if (vRes.ok && !vData.error) {
                const updated = { ...file, extracted: vData.extracted };
                setFiles(prev => prev.map(f => f.id === file.id ? updated : f));

                const valRes = await fetch(CF_VALIDATOR_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ extraction: vData.extracted, slide_number: updated.orderIndex! + 1, total_slides: totalFiles }),
                });
                const valData = await valRes.json();
                updated.confidence = valData.score ?? 0;
                updated.validatorDecision = valData.decision ?? 'human_review';

                const srcText = vData.extracted?.headline || vData.extracted?.body || '';
                if (srcText.trim().length > 3) {
                    const tRes = await fetch(CF_TRANSLATOR_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ source_text: srcText, source_language: 'en', target_language: 'sw' }),
                    });
                    const tData = await tRes.json();
                    updated.translationDraft = tData.translated_text || null;
                    setFiles(prev => prev.map(f => f.id === file.id ? updated : f));

                    const ex = updated.extracted;
                    const fields = [
                        { type: 'headline', text: ex?.headline?.trim() },
                        { type: 'subheadline', text: ex?.subheadline?.trim() },
                        { type: 'body', text: ex?.body?.trim() },
                        { type: 'cta_directive', text: ex?.cta_directive?.trim() },
                        { type: 'cta_support', text: ex?.cta_support?.trim() },
                    ].filter(f => f.text);

                    for (const f of fields) {
                        await (supabase as any).from('translation_units').upsert({
                            batch_id: carouselId,
                            carousel_id: carouselId,
                            slide_number: updated.orderIndex! + 1,
                            type: f.type,
                            source_text: f.text,
                            active: true,
                            ...(f.type === 'headline' && updated.translationDraft ? { ai_draft_sw: updated.translationDraft } : {}),
                        }, { onConflict: 'carousel_id,slide_number,type' });
                    }
                }
            }
        } catch (err) {
            console.error('Vision pipeline failed for slide', err);
        }
    };

    const processFile = async (uploadFile: UploadFile, galleryIdOverride?: string): Promise<void> => {
        setFiles(prev =>
            prev.map(f => (f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 10 } : f))
        );

        try {
            const finalFolder = customFolder || targetFolder;
            const finalCarouselId = galleryIdOverride || selectedCarousel;
            const isImage = uploadFile.type.startsWith('image');

            const variantsToUpload: { file: File; suffix: string; quality: string }[] = [{ file: uploadFile.file, suffix: '_4k', quality: '4k' }];
            let sourceDims = { width: 0, height: 0 };
            const qualitiesAvailable: string[] = ['4k'];

            if (isImage) {
                try {
                    sourceDims = await getImageDimensions(uploadFile.file);
                    if (sourceDims.height >= 320) {
                        const sd = await churnImage(uploadFile.file, '320p');
                        variantsToUpload.push({ file: sd, suffix: '_320p', quality: '320p' });
                        qualitiesAvailable.push('320p');
                    }
                    if (sourceDims.height >= 720) {
                        const hd = await churnImage(uploadFile.file, '720p');
                        variantsToUpload.push({ file: hd, suffix: '_720p', quality: '720p' });
                        qualitiesAvailable.push('720p');
                    }
                    if (sourceDims.height >= 1080) {
                        const fhd = await churnImage(uploadFile.file, '1080p');
                        variantsToUpload.push({ file: fhd, suffix: '_1080p', quality: '1080p' });
                        qualitiesAvailable.push('1080p');
                    }
                } catch (churnErr) {
                    console.warn('[Churn] Multi-quality churn failed, falling back to original only', churnErr);
                }
            }

            const commonTimestamp = Date.now();
            const cleanBaseName = uploadFile.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9.-]/g, '_');
            const cleanExt = uploadFile.name.split('.').pop();
            const variantBase = `${finalFolder}/${commonTimestamp}-${cleanBaseName}`;
            const variantPaths: string[] = [];
            let mainResult: any = null;

            for (const variant of variantsToUpload) {
                let result;
                const variantFileName = variant.suffix === '_4k'
                    ? `${variantBase}.${cleanExt}`
                    : `${variantBase}${variant.suffix}.${cleanExt}`;

                if (storageProvider === 'b2') {
                    result = await backblazeStorage.uploadFile(
                        variant.file,
                        finalFolder,
                        (progress) => {
                            if (variant.suffix === '_4k') {
                                setFiles(prev =>
                                    prev.map(f => (f.id === uploadFile.id ? { ...f, progress: Math.min(progress, 90) } : f))
                                );
                            }
                        },
                        variantFileName
                    );
                } else {
                    const filePath = variantFileName;
                    const { data, error } = await supabase.storage.from('resources').upload(filePath, variant.file);
                    if (error) throw error;
                    const { data: urlData } = supabase.storage.from('resources').getPublicUrl(filePath);
                    result = { success: true, fileUrl: urlData.publicUrl, fileName: filePath };
                }

                if (result.success) {
                    variantPaths.push(result.fileName);
                    if (variant.quality === '4k') mainResult = result;
                }
            }

            if (!mainResult || !mainResult.success) {
                throw new Error(mainResult?.error || 'Upload failed');
            }

            let aspectRatio = '1:1';
            if (isImage) {
                aspectRatio = await mediaService.detectAspectRatio(uploadFile.file);
            }

            let dbId: string | undefined;
            let orderIndex = 0;

            if (regMode === 'resource') {
                const tagsRaw = useSharedMetadata ? sharedMetadata.tags : uploadFile.stagedTags;
                const tagsArray = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);

                const { data: inserted, error: sqlError } = await supabase.from('resources').insert({
                    title: useSharedMetadata && sharedMetadata.title ? sharedMetadata.title : uploadFile.stagedTitle,
                    description: (useSharedMetadata ? sharedMetadata.description : uploadFile.stagedDescription) || 'Uploaded via Advanced B2 Cloud Manager',
                    url: mainResult.fileUrl || '',
                    type: uploadFile.type.split('/')[0] || 'document',
                    category: category,
                    tags: tagsArray,
                    status: isInstantPublish ? 'published' : 'draft',
                    downloads: 0,
                    views: 0
                }).select('id').single();
                if (sqlError) throw sqlError;
                dbId = inserted?.id;
            } else if (regMode === 'carousel_item' && finalCarouselId) {
                if (isInstantPublish) {
                    await (supabase as any).from('media_content').update({ status: 'published' }).eq('id', finalCarouselId);
                }

                const { data: currentItems } = await (supabase.from('media_items' as any) as any)
                    .select('order_index')
                    .eq('content_id', finalCarouselId)
                    .order('order_index', { ascending: false })
                    .limit(1);

                const nextOrder = (currentItems && currentItems[0] ? currentItems[0].order_index + 1 : 0);
                orderIndex = nextOrder;

                const { data: insertedItem, error: sqlError } = await (supabase.from('media_items' as any) as any).insert({
                    content_id: finalCarouselId,
                    type: isImage ? 'image' : uploadFile.type === 'application/pdf' ? 'pdf' : 'video',
                    file_path: mainResult.fileName,
                    file_url: mainResult.fileUrl,
                    order_index: nextOrder,
                    status: isInstantPublish ? 'published' : 'draft',
                    metadata: {
                        original_name: uploadFile.name,
                        title: uploadFile.stagedTitle,
                        aspect_ratio: aspectRatio,
                        qualities: qualitiesAvailable,
                        width: sourceDims.width,
                        height: sourceDims.height,
                        ...(useSharedMetadata ? {
                            shared_title: sharedMetadata.title,
                            shared_description: sharedMetadata.description
                        } : {})
                    }
                }).select('id').single();
                if (sqlError) throw sqlError;
                dbId = insertedItem?.id;

                uploadFile.orderIndex = nextOrder;
            }

            setFiles(prev =>
                prev.map(f =>
                    f.id === uploadFile.id
                        ? {
                            ...f,
                            status: 'success',
                            progress: 100,
                            url: mainResult.fileUrl,
                            storagePath: mainResult.fileName,
                            variantPaths,
                            storageProviderUsed: storageProvider,
                            regModeUsed: regMode,
                            dbId,
                            carouselId: finalCarouselId || undefined,
                            orderIndex: orderIndex,
                        }
                        : f
                )
            );

            if (regMode === 'carousel_item' && isImage && finalCarouselId) {
                const totalFiles = files.filter(f => f.status === 'staged' || f.status === 'pending').length + 1;
                await runVisionPipelineForSlide(uploadFile, finalCarouselId, totalFiles);
            }
        } catch (error: any) {
            console.error('Processing error:', error);
            setFiles(prev =>
                prev.map(f => (f.id === uploadFile.id ? { ...f, status: 'error', progress: 0, error: error.message } : f))
            );
        }
    };

    const startBatchUpload = async () => {
        const stagged = files.filter(f => f.status === 'staged' || f.status === 'pending');
        if (stagged.length === 0) {
            toast({ title: 'Add images first', description: 'Review your files before uploading.', variant: 'destructive' });
            return;
        }

        if (storageProvider === 'b2' && !backblazeReady) {
            toast({
                title: 'Storage Error',
                description: 'Cannot connect to Backblaze. Using Supabase instead.',
                variant: 'destructive'
            });
            return;
        }

        if (regMode === 'carousel_item') {
            if (!selectedCarousel && !isCreatingNewCarousel) {
                toast({ title: 'Pick a Carousel', description: 'Where should these images go?', variant: 'destructive' });
                return;
            }
            if (isCreatingNewCarousel && !carouselInfo.title) {
                toast({ title: 'Title Needed', description: 'What is the name of this new carousel?', variant: 'destructive' });
                return;
            }
        }

        setUploading(true);

        let finalCarouselId = selectedCarousel;

        if (regMode === 'carousel_item' && isCreatingNewCarousel) {
            try {
                const tagsArray = carouselInfo.tags.split(',').map(t => t.trim()).filter(Boolean);
                const created = await mediaService.createContent({
                    type: 'carousel',
                    title: carouselInfo.title,
                    description: carouselInfo.description,
                    slug: carouselInfo.slug,
                    tags: tagsArray,
                    status: 'published',
                    metadata: {
                        created_via: 'BulkUploadManager',
                        storage_provider: storageProvider
                    }
                });

                if (created) {
                    finalCarouselId = created.id;
                    await fetchCarousels();
                    setSelectedCarousel(created.id);
                    setIsCreatingNewCarousel(false);
                } else {
                    throw new Error('Failed to start new carousel');
                }
            } catch (err: any) {
                toast({ title: 'Failed to create carousel', description: err.message, variant: 'destructive' });
                setUploading(false);
                return;
            }
        }

        for (const file of stagged) {
            await processFile(file, finalCarouselId);
        }

        setUploading(false);
        toast({ title: 'Success', description: `${stagged.length} items live on the site.` });
    };

    const deletePersistedFile = async (file: UploadFile) => {
        setDeletingFiles(prev => new Set(prev).add(file.id));
        try {
            if (file.dbId && file.regModeUsed) {
                if (file.regModeUsed === 'resource') {
                    await supabase.from('resources').delete().eq('id', file.dbId);
                } else if (file.regModeUsed === 'carousel_item') {
                    if (file.carouselId && file.orderIndex !== undefined) {
                        await (supabase as any)
                            .from('translation_units')
                            .delete()
                            .eq('carousel_id', file.carouselId)
                            .eq('slide_number', file.orderIndex + 1);
                    }
                    await (supabase.from('media_items' as any) as any).delete().eq('id', file.dbId);

                    if (file.carouselId) {
                        const { count } = await (supabase.from('media_items' as any) as any)
                            .select('*', { count: 'exact', head: true })
                            .eq('content_id', file.carouselId);
                        if (count === 0) {
                            await (supabase.from('media_content' as any) as any).delete().eq('id', file.carouselId);
                            window.dispatchEvent(new CustomEvent('carousel-deleted', { detail: { carouselId: file.carouselId } }));
                            await fetchCarousels();
                        }
                    }
                }
            }

            const paths = file.variantPaths ?? (file.storagePath ? [file.storagePath] : []);
            if (paths.length > 0) {
                if (file.storageProviderUsed === 'b2') {
                    for (const path of paths) {
                        await backblazeStorage.deleteFile(path);
                    }
                } else {
                    await supabase.storage.from('resources').remove(paths as string[]);
                }
            }

            setFiles(prev => prev.filter(f => f.id !== file.id));
            toast({ title: 'Deleted', description: `${file.stagedTitle || file.name} removed.` });
        } catch (err: any) {
            toast({ title: 'Deletion failed', description: err.message, variant: 'destructive' });
        } finally {
            setDeletingFiles(prev => {
                const next = new Set(prev);
                next.delete(file.id);
                return next;
            });
        }
    };

    const removeFile = (id: string) => {
        const file = files.find(f => f.id === id);
        if (file && file.status === 'success') {
            deletePersistedFile(file);
        } else {
            setFiles(prev => prev.filter(f => f.id !== id));
        }
    };

    const clearCompleted = () => {
        setFiles(prev => prev.filter(f => f.status !== 'success'));
    };

    const getFileIcon = (type: string) => {
        if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
        if (type.startsWith('video/')) return <Video className="h-4 w-4" />;
        if (type.startsWith('audio/')) return <Music className="h-4 w-4" />;
        if (type.includes('pdf')) return <FileText className="h-4 w-4" />;
        return <FileIcon className="h-4 w-4" />;
    };

    const formatSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getStatusBadge = (file: UploadFile) => {
        switch (file.status) {
            case 'staged': return <Badge variant="outline" className="text-amber-500 border-amber-500/20">Staged</Badge>;
            case 'uploading': return <Badge variant="outline" className="text-blue-500 border-blue-500/20"><CEKALoader variant="ios" size="sm" />{file.progress}%</Badge>;
            case 'success': return <Badge variant="outline" className="text-green-500 border-green-500/20 font-black">ACTIVE</Badge>;
            case 'error': return <Badge variant="destructive" className="text-[8px]">{file.error || 'FAILED'}</Badge>;
            default: return <Badge variant="outline">Pending</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black tracking-tighter flex items-center gap-2">
                        Advanced Cloud Manager
                        <Badge className="bg-primary/10 text-primary border-0 font-bold uppercase text-[10px]">Go Ham Mode</Badge>
                    </h2>
                    <p className="text-muted-foreground text-sm font-medium">
                        Securely save images to the cloud and register them to your carousels.
                    </p>
                </div>
                <div className="flex items-center gap-1 bg-black/10 backdrop-blur-xl p-1 rounded-2xl border border-white/10 shadow-ios-inner glass-card">
                    <button
                        onClick={() => setStorageProvider('b2')}
                        className={`px-4 h-9 rounded-xl text-[10px] font-black uppercase transition-all duration-500 shadow-skeuo flex items-center gap-2 ${storageProvider === 'b2'
                            ? 'bg-kenya-green text-white shadow-[0_4px_12px_rgba(0,136,71,0.4)]'
                            : 'bg-kenya-red/60 text-white/70 hover:bg-kenya-red/80'}`}
                    >
                        <div className={`h-1.5 w-1.5 rounded-full ${backblazeReady ? 'bg-white animate-pulse' : 'bg-white/40'}`} />
                        B2 Database
                    </button>
                    <button
                        onClick={() => setStorageProvider('supabase')}
                        className={`px-4 h-9 rounded-xl text-[10px] font-black uppercase transition-all duration-500 shadow-skeuo flex items-center gap-2 ${storageProvider === 'supabase'
                            ? 'bg-kenya-green text-white shadow-[0_4px_12px_rgba(0,136,71,0.4)]'
                            : 'bg-kenya-red/60 text-white/70 hover:bg-kenya-red/80'}`}
                    >
                        <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                        Supabase
                    </button>
                </div>
            </div>

            {/* Social Post & URL Auto-Extractor */}
            <Card className="border-0 shadow-ios-high bg-card/50 backdrop-blur-xl border-l-4 border-l-kenya-green">
                <CardHeader className="pb-3 border-b border-muted/20">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Link2 className="h-4 w-4 text-kenya-green" />
                            <span>Instagram & Web Post URL Auto-Extractor</span>
                            <Badge className="bg-kenya-green/10 text-kenya-green border-kenya-green/20 text-[9px] font-bold">Automated Ingest</Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-semibold lowercase">paste URL ➔ pull metadata + slides</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    <div className="flex flex-col md:flex-row gap-3 items-end">
                        <div className="flex-1 space-y-1.5 w-full">
                            <Label className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Paste Instagram / Web Post URL</Label>
                            <Input
                                className="rounded-xl border-2 h-12 text-sm font-medium"
                                placeholder="https://www.instagram.com/p/C1a2b3c4d5e/ or https://example.com/media/piece-1"
                                value={socialUrl}
                                onChange={(e) => setSocialUrl(e.target.value)}
                            />
                        </div>

                        <div className="w-full md:w-48 space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Extractor Engine</Label>
                            <Select value={extractionEngine} onValueChange={(v: any) => setExtractionEngine(v)}>
                                <SelectTrigger className="rounded-xl border-2 h-12 text-xs font-bold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="apify">Apify Actor API</SelectItem>
                                    <SelectItem value="sociavault">SociaVault REST API</SelectItem>
                                    <SelectItem value="opengraph">OpenGraph Meta API</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            onClick={handleExtractSocialUrl}
                            disabled={extractingUrl || !socialUrl.trim()}
                            className="h-12 rounded-xl px-6 font-black uppercase tracking-wider text-xs bg-kenya-green hover:bg-kenya-green/90 text-white gap-2 shrink-0 w-full md:w-auto"
                        >
                            {extractingUrl ? <CEKALoader size="xs" /> : <DownloadCloud className="w-4 h-4" />}
                            {extractingUrl ? 'Extracting...' : 'Extract & Stage Carousel'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Global Infrastructure Config */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-0 shadow-ios-high bg-card/50 backdrop-blur-xl">
                    <CardHeader className="pb-3 border-b border-muted/20">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <Settings className="h-4 w-4" /> Infrastructure Setup
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Target Database Directory</Label>
                                <Select value={targetFolder} onValueChange={setTargetFolder}>
                                    <SelectTrigger className="rounded-xl border-2 h-12">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STORAGE_FOLDERS.map((f) => (
                                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Custom Cloud Path (e.g. carousels/special)</Label>
                                <Input
                                    className="rounded-xl border-2 h-12"
                                    placeholder="resources/2026/election"
                                    value={customFolder}
                                    onChange={(e) => setCustomFolder(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Automated SQL Mode</Label>
                                <Select value={regMode} onValueChange={(v: any) => setRegMode(v)}>
                                    <SelectTrigger className="rounded-xl border-2 h-12">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="resource">Resource Library Item</SelectItem>
                                        <SelectItem value="carousel_item">Attach to Carousel</SelectItem>
                                        <SelectItem value="storage_only">Cloud Storage Only</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {regMode === 'resource' && (
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Category</Label>
                                    <Select value={category} onValueChange={setCategory}>
                                        <SelectTrigger className="rounded-xl border-2 h-12">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIES.map((c) => (
                                                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {regMode === 'carousel_item' && (
                                <div className="space-y-4 animate-in slide-in-from-top duration-500">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Target Carousel</Label>
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                id="use-shared"
                                                checked={useSharedMetadata}
                                                onCheckedChange={(v: any) => setUseSharedMetadata(v)}
                                            />
                                            <Label htmlFor="use-shared" className="text-[10px] font-bold cursor-pointer">Use Shared Metadata</Label>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Select
                                            value={isCreatingNewCarousel ? 'NEW' : selectedCarousel}
                                            onValueChange={(v) => {
                                                if (v === 'NEW') {
                                                    setIsCreatingNewCarousel(true);
                                                    setSelectedCarousel('');
                                                } else {
                                                    setIsCreatingNewCarousel(false);
                                                    setSelectedCarousel(v);
                                                }
                                            }}
                                        >
                                            <SelectTrigger className="rounded-xl border-2 h-12 shadow-ios-inner bg-background/50 flex-1">
                                                <SelectValue placeholder="Select a Carousel..." />
                                            </SelectTrigger>
                                            <SelectContent className="glass-card">
                                                <SelectItem value="NEW" className="font-bold text-primary italic">+ New Carousel</SelectItem>
                                                {carousels.map((c) => (
                                                    <SelectItem key={c.id} value={c.id}>{c.title} ({c.slug})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {!isCreatingNewCarousel && selectedCarousel && (
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                disabled={deletingCarousel === selectedCarousel}
                                                onClick={() => confirmDeleteCarousel(selectedCarousel)}
                                                className="h-12 w-12 rounded-xl bg-kenya-red/10 hover:bg-kenya-red/20 border border-kenya-red/20"
                                            >
                                                {deletingCarousel === selectedCarousel ? (
                                                    <CEKALoader variant="ios" size="sm" />
                                                ) : (
                                                    <AlertTriangle className="h-5 w-5 text-kenya-red" />
                                                )}
                                            </Button>
                                        )}
                                    </div>

                                    {isCreatingNewCarousel && (
                                        <div className="p-5 rounded-2xl bg-primary/5 border-2 border-primary/20 space-y-4 glass-card shadow-ios-high animate-in zoom-in-95 duration-300">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-[9px] font-black uppercase">Carousel Title</Label>
                                                    <Input
                                                        value={carouselInfo.title}
                                                        onChange={(e) => {
                                                            const title = e.target.value;
                                                            const slug = title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
                                                            setCarouselInfo(prev => ({ ...prev, title, slug }));
                                                        }}
                                                        className="rounded-xl h-10 border-muted/30 focus:border-primary/50"
                                                        placeholder="e.g. My Awesome Trip"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[9px] font-black uppercase">Slug</Label>
                                                    <Input
                                                        value={carouselInfo.slug}
                                                        onChange={(e) => setCarouselInfo(prev => ({ ...prev, slug: e.target.value }))}
                                                        className="rounded-xl h-10 border-muted/30 font-mono text-xs bg-muted/10 opacity-70"
                                                        placeholder="my-awesome-trip"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[9px] font-black uppercase">Carousel Description</Label>
                                                <Textarea
                                                    value={carouselInfo.description}
                                                    onChange={(e) => setCarouselInfo(prev => ({ ...prev, description: e.target.value }))}
                                                    className="rounded-xl min-h-[80px] border-muted/30"
                                                    placeholder="What's this carousel about?"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[9px] font-black uppercase">Tags (Comma separated)</Label>
                                                <Input
                                                    value={carouselInfo.tags}
                                                    onChange={(e) => setCarouselInfo(prev => ({ ...prev, tags: e.target.value }))}
                                                    className="rounded-xl h-10 border-muted/30"
                                                    placeholder="travel, fun"
                                                />
                                            </div>

                                            <div className="flex items-center gap-2 pt-2">
                                                <Checkbox
                                                    id="instant-publish"
                                                    checked={isInstantPublish}
                                                    onCheckedChange={(v: any) => setIsInstantPublish(v)}
                                                />
                                                <Label htmlFor="instant-publish" className="text-[10px] font-bold cursor-pointer text-primary">Instant Publish (One-Click)</Label>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className="border-2 border-dashed border-muted-foreground/25 bg-card/20 backdrop-blur-xl hover:border-primary/50 transition-all flex flex-col items-center justify-center p-6 text-center cursor-pointer group"
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                >
                    <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Upload className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-black text-lg">Add Files, Folders, or ZIPs</h3>
                    <p className="text-xs text-muted-foreground mb-4">Click, drop images, folders, or drop a .zip archive</p>
                    <input ref={fileInputRef} type="file" multiple accept="image/*,.zip,.rar" className="hidden" onChange={onFileInputChange} />
                    <input ref={folderInputRef} type="file" multiple {...{ webkitdirectory: "", directory: "" } as any} className="hidden" onChange={onFileInputChange} />
                    <div className="flex gap-2">
                        <Button variant="outline" className="rounded-xl h-10 px-6 font-bold border-2" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>Select Files</Button>
                        <Button variant="outline" className="rounded-xl h-10 px-6 font-bold border-2" onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}><Folder className="h-4 w-4 mr-2"/>Upload Folder</Button>
                    </div>
                </Card>
            </div>

            {/* Shared Metadata Section */}
            {useSharedMetadata && files.length > 0 && (
                <Card className="border-0 shadow-ios-high bg-primary/5 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/40" />
                    <CardHeader className="pb-3 border-b border-primary/10">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <PlusCircle className="h-4 w-4" /> Shared Metadata for All
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Title Override</Label>
                            <Input
                                value={sharedMetadata.title}
                                onChange={(e) => setSharedMetadata(prev => ({ ...prev, title: e.target.value }))}
                                className="rounded-xl border-2 h-12 bg-background/50 shadow-ios-inner"
                                placeholder="Common Title..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Shared Tags</Label>
                            <Input
                                value={sharedMetadata.tags}
                                onChange={(e) => setSharedMetadata(prev => ({ ...prev, tags: e.target.value }))}
                                className="rounded-xl border-2 h-12 bg-background/50 shadow-ios-inner"
                                placeholder="news, alert"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Shared Description</Label>
                            <Textarea
                                value={sharedMetadata.description}
                                onChange={(e) => setSharedMetadata(prev => ({ ...prev, description: e.target.value }))}
                                className="rounded-xl border-2 min-h-[48px] h-12 py-3 bg-background/50 shadow-ios-inner"
                                placeholder="Common info for all files..."
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Staging & Review Queue */}
            {files.length > 0 && (
                <Card className="border-0 shadow-ios-high bg-card/50 backdrop-blur-xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-muted/20">
                        <div>
                            <CardTitle className="text-lg font-black tracking-tight">Upload Queue</CardTitle>
                            <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-primary">Ready for Review</CardDescription>
                        </div>
                        <div className="flex gap-3">
                            <Button size="sm" variant="outline" onClick={clearCompleted} className="rounded-xl font-bold h-10 border-2">Clear</Button>
                            <Button
                                size="sm"
                                onClick={startBatchUpload}
                                disabled={uploading || (storageProvider === 'b2' && backblazeReady === false)}
                                className="rounded-xl h-10 px-6 font-black bg-primary shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                {uploading ? <CEKALoader variant="ios" size="sm" /> : <Zap className="h-4 w-4 mr-2" />}
                                {isInstantPublish ? "Instant Publish" : "Start Upload"}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4 max-h-[60vh] overflow-y-auto hide-scrollbar">
                        {files.map((file) => (
                            <div key={file.id} className={`group p-4 rounded-2xl border-2 transition-all duration-300 ${file.status === 'success' ? 'bg-green-50/30 border-green-500/20 shadow-ios-low' : 'bg-muted/10 border-muted/20 hover:border-primary/30'} ${expandedFiles[file.id] ? 'ring-2 ring-primary/20 shadow-ios-high bg-card/80' : ''}`}>
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-xl bg-background flex items-center justify-center text-muted-foreground shadow-ios-inner group-hover:scale-105 transition-transform">
                                        {getFileIcon(file.type)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className="font-bold text-sm truncate uppercase tracking-tight">
                                                {useSharedMetadata && sharedMetadata.title ? sharedMetadata.title : (file.stagedTitle || file.name)}
                                            </h4>
                                            <div className="flex items-center gap-2">
                                                {getStatusBadge(file)}
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => setExpandedFiles(prev => ({ ...prev, [file.id]: !prev[file.id] }))}
                                                    className="rounded-lg h-8 w-8 hover:bg-primary/10 transition-all duration-300"
                                                    style={{ transform: expandedFiles[file.id] ? 'rotate(180deg)' : 'rotate(0deg)' }}
                                                >
                                                    <ChevronDown className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">
                                            {formatSize(file.size)} • {file.type.split('/')[1] || 'FILE'}
                                        </p>
                                        {file.extracted?.headline && (
                                            <p className="text-[11px] text-white/40 truncate mt-0.5">"{file.extracted.headline}"</p>
                                        )}
                                        {file.translationDraft && (
                                            <p className="text-[11px] text-ios-blue/80 truncate mt-0.5">{file.translationDraft}</p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1">
                                        {file.url && (
                                            <Button size="icon" variant="ghost" className="rounded-xl h-9 w-9" asChild>
                                                <a href={file.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                                            </Button>
                                        )}
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => removeFile(file.id)}
                                            disabled={file.status === 'uploading' || deletingFiles.has(file.id)}
                                            className="rounded-xl h-9 w-9 hover:bg-kenya-red/10 hover:text-kenya-red"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {expandedFiles[file.id] && (
                                    <div className="mt-4 pt-4 border-t border-muted/20 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                                        <div className="space-y-1">
                                            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Individual Title override</Label>
                                            <Input
                                                value={file.stagedTitle}
                                                onChange={(e) => updateStagedFile(file.id, { stagedTitle: e.target.value })}
                                                className="h-10 rounded-xl bg-background/50 shadow-ios-inner border-muted/30"
                                                disabled={file.status !== 'staged'}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Individual Tags</Label>
                                            <Input
                                                value={file.stagedTags}
                                                placeholder="Override shared tags..."
                                                onChange={(e) => updateStagedFile(file.id, { stagedTags: e.target.value })}
                                                className="h-10 rounded-xl bg-background/50 shadow-ios-inner border-muted/30"
                                                disabled={file.status !== 'staged'}
                                            />
                                        </div>
                                        <div className="md:col-span-2 space-y-1">
                                            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Individual Description</Label>
                                            <Input
                                                value={file.stagedDescription}
                                                placeholder="Deep context override..."
                                                onChange={(e) => updateStagedFile(file.id, { stagedDescription: e.target.value })}
                                                className="h-10 rounded-xl bg-background/50 shadow-ios-inner border-muted/30"
                                                disabled={file.status !== 'staged'}
                                            />
                                        </div>
                                    </div>
                                )}

                                {file.status === 'uploading' && (
                                    <div className="mt-4 px-1">
                                        <Progress value={file.progress} className="h-1.5 shadow-ios-inner" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Live Carousels List */}
            <Card className="border-0 shadow-ios-high bg-card/50 backdrop-blur-xl">
                <CardHeader className="pb-3 border-b border-muted/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-black tracking-tight">Live Carousels</CardTitle>
                            <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-primary">View, Archive, or Delete</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-3 max-h-96 overflow-y-auto hide-scrollbar">
                    {carousels.length === 0 ? (
                        <p className="text-muted-foreground text-sm text-center py-8">No carousels created yet.</p>
                    ) : (
                        carousels.map((carousel) => (
                            <div
                                key={carousel.id}
                                className="flex items-center justify-between p-4 rounded-2xl bg-muted/5 border border-muted/20 hover:border-primary/20 transition-all"
                            >
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-sm truncate">{carousel.title}</h4>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{carousel.slug}</p>
                                    {carousel.status && (
                                        <Badge variant="outline" className="mt-1 text-[9px] capitalize">{carousel.status}</Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 ml-4">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-9 w-9 rounded-xl"
                                        asChild
                                    >
                                        <Link to={`/carousel/${carousel.slug}`} target="_blank">
                                            <ExternalLink className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => archiveCarousel(carousel.id, carousel.status)}
                                        disabled={archivingCarousel.has(carousel.id)}
                                        className="h-9 w-9 rounded-xl hover:bg-amber-500/10 hover:text-amber-500"
                                    >
                                        {archivingCarousel.has(carousel.id) ? (
                                            <CEKALoader variant="ios" size="sm" />
                                        ) : (
                                            <Archive className="h-4 w-4" />
                                        )}
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => confirmDeleteCarousel(carousel.id)}
                                        disabled={deletingCarousel === carousel.id}
                                        className="h-9 w-9 rounded-xl hover:bg-kenya-red/10 hover:text-kenya-red"
                                    >
                                        {deletingCarousel === carousel.id ? (
                                            <CEKALoader variant="ios" size="sm" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>

            {/* Help / Context */}
            <Card className="border-0 shadow-lg bg-primary/5">
                <CardContent className="py-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-primary/80 leading-tight italic">
                        <strong>Go Ham Cloud Logic:</strong> When you upload, we save your images securely and link them to your carousel immediately.
                        No extra steps needed.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};

export default BulkUploadManager;