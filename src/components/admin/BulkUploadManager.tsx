// Bulk Upload Manager - Advanced B2 Cloud Manager
// Supports custom folder creation, staged metadata review, and automated SQL sync
// for both the Resource Library and Instagram-style Carousels.

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
    Upload, Folder, File, X, CheckCircle, XCircle, Clock, RefreshCw,
    Image, FileText, Music, Video, Archive, Trash2, Eye, Edit3, Save, Plus, ExternalLink, Settings, Zap,
    ChevronDown, PlusCircle
} from 'lucide-react';
import backblazeStorage from '@/services/backblazeStorage';
import { supabase } from '@/integrations/supabase/client';
import { mediaService, MediaContent } from '@/services/mediaService';
import { CEKALoader } from '@/components/ui/ceka-loader';

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

    // Staged metadata
    stagedTitle: string;
    stagedDescription: string;
    stagedTags: string;
}

type RegistrationMode = 'storage_only' | 'resource' | 'carousel_item';

const STORAGE_FOLDERS = [
    { value: 'resources', label: 'Resources' },
    { value: 'carousels', label: 'Carousels' },
    { value: 'documents', label: 'Documents' },
    { value: 'media', label: 'Media' },
    { value: 'legislation', label: 'Legislation' }
];

interface NewCarouselData {
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

const BulkUploadManager = () => {
    const [files, setFiles] = useState<UploadFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [targetFolder, setTargetFolder] = useState('resources');
    const [customFolder, setCustomFolder] = useState('');
    const [regMode, setRegMode] = useState<RegistrationMode>('resource');
    const [category, setCategory] = useState('general');
    const [selectedCarousel, setSelectedCarousel] = useState<string>('');
    const [isCreatingNewCarousel, setIsCreatingNewCarousel] = useState(false);
    const [newCarousel, setNewCarousel] = useState<NewCarouselData>({
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

    const [backblazeReady, setBackblazeReady] = useState<boolean | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    // Check Backblaze on mount and fetch carousels
    useEffect(() => {
        checkBackblaze();
        fetchCarousels();
    }, []);

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

    // Add files from input
    const handleFilesSelected = useCallback((selectedFiles: FileList | null) => {
        if (!selectedFiles) return;

        // Strict limit for carousels
        if (regMode === 'carousel_item' && (files.length + selectedFiles.length) > 20) {
            toast({
                title: 'Limit Reached',
                description: 'Carousels are limited to 20 images for optimal performance.',
                variant: 'destructive'
            });
            return;
        }

        const newFiles: UploadFile[] = Array.from(selectedFiles).map((file) => ({
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            file,
            name: file.name,
            size: file.size,
            type: file.type,
            status: 'staged',
            progress: 0,
            stagedTitle: file.name.replace(/\.[^/.]+$/, ''),
            stagedDescription: '',
            stagedTags: ''
        }));

        setFiles((prev) => [...prev, ...newFiles]);
    }, [files.length, regMode, toast]);

    // Handle drag and drop
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const dt = e.dataTransfer;
        handleFilesSelected(dt.files);
    }, [handleFilesSelected]);

    // Update staged metadata
    const updateStagedFile = (id: string, updates: Partial<UploadFile>) => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    // Upload single file to selected storage and Sync to SQL
    const processFile = async (uploadFile: UploadFile, carouselIdOverride?: string): Promise<void> => {
        setFiles((prev) =>
            prev.map((f) => (f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 10 } : f))
        );

        try {
            const finalFolder = customFolder || targetFolder;
            const finalCarouselId = carouselIdOverride || selectedCarousel;

            // 1. Upload to Storage (B2 or Supabase)
            let result;
            if (storageProvider === 'b2') {
                result = await backblazeStorage.uploadFile(
                    uploadFile.file,
                    finalFolder,
                    (progress) => {
                        setFiles((prev) =>
                            prev.map((f) => (f.id === uploadFile.id ? { ...f, progress: Math.min(progress, 90) } : f))
                        );
                    }
                );
            } else {
                // Force Supabase upload
                const filePath = `${finalFolder}/${Date.now()}-${uploadFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                const { data, error } = await supabase.storage
                    .from('resources')
                    .upload(filePath, uploadFile.file);
                
                if (error) throw error;
                
                const { data: urlData } = supabase.storage.from('resources').getPublicUrl(filePath);
                result = { success: true, fileUrl: urlData.publicUrl, fileName: filePath };
            }

            if (!result.success) {
                throw new Error(result.error || 'Upload failed');
            }

            // 1.5 Detect Aspect Ratio for images
            let aspectRatio = '1:1';
            if (uploadFile.type.startsWith('image')) {
                aspectRatio = await mediaService.detectAspectRatio(uploadFile.file);
            }

            // 2. Automated SQL Sync based on Registration Mode
            if (regMode === 'resource') {
                const tagsRaw = useSharedMetadata ? sharedMetadata.tags : uploadFile.stagedTags;
                const tagsArray = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
                
                const { error: sqlError } = await supabase.from('resources').insert({
                    title: useSharedMetadata && sharedMetadata.title ? sharedMetadata.title : uploadFile.stagedTitle,
                    description: (useSharedMetadata ? sharedMetadata.description : uploadFile.stagedDescription) || 'Uploaded via Advanced B2 Cloud Manager',
                    url: result.fileUrl || '',
                    type: uploadFile.type.split('/')[0] || 'document',
                    category: category,
                    tags: tagsArray,
                    downloads: 0,
                    views: 0
                });
                if (sqlError) throw sqlError;
            }
            else if (regMode === 'carousel_item' && finalCarouselId) {
                // Get the current max order_index for this carousel
                const { data: currentItems } = await (supabase
                    .from('media_items' as any) as any)
                    .select('order_index')
                    .eq('content_id', finalCarouselId)
                    .order('order_index', { ascending: false })
                    .limit(1);

                const nextOrder = (currentItems && currentItems[0] ? currentItems[0].order_index + 1 : 0);

                const { error: sqlError } = await (supabase.from('media_items' as any) as any).insert({
                    content_id: finalCarouselId,
                    type: uploadFile.type.startsWith('image') ? 'image' :
                        uploadFile.type === 'application/pdf' ? 'pdf' : 'video',
                    file_path: result.fileName,
                    file_url: result.fileUrl,
                    order_index: nextOrder,
                    metadata: {
                        original_name: uploadFile.name,
                        title: uploadFile.stagedTitle,
                        aspect_ratio: aspectRatio,
                        ...(useSharedMetadata ? { 
                            shared_title: sharedMetadata.title,
                            shared_description: sharedMetadata.description
                        } : {})
                    }
                });
                if (sqlError) throw sqlError;
            }

            setFiles((prev) =>
                prev.map((f) =>
                    f.id === uploadFile.id
                        ? { ...f, status: 'success', progress: 100, url: result.fileUrl }
                        : f
                )
            );
        } catch (error: any) {
            console.error('Processing error:', error);
            setFiles((prev) =>
                prev.map((f) =>
                    f.id === uploadFile.id
                        ? { ...f, status: 'error', progress: 0, error: error.message }
                        : f
                )
            );
        }
    };

    // Start Batch Upload
    const startBatchUpload = async () => {
        const stagged = files.filter((f) => f.status === 'staged' || f.status === 'pending');
        if (stagged.length === 0) {
            toast({ title: 'No files to process', description: 'Add files and review metadata first', variant: 'destructive' });
            return;
        }

        if (storageProvider === 'b2' && !backblazeReady) {
            toast({
                title: 'Backblaze Unavailable',
                description: 'Check B2 credentials or fallback to Supabase Storage',
                variant: 'destructive'
            });
            return;
        }

        if (regMode === 'carousel_item') {
            if (!selectedCarousel && !isCreatingNewCarousel) {
                toast({ title: 'Required Field', description: 'Please select a Target Carousel', variant: 'destructive' });
                return;
            }
            if (isCreatingNewCarousel && !newCarousel.title) {
                toast({ title: 'Required Field', description: 'Please provide a Title for the new carousel', variant: 'destructive' });
                return;
            }
        }

        setUploading(true);

        let finalCarouselId = selectedCarousel;

        // 1. Create New Carousel if needed
        if (regMode === 'carousel_item' && isCreatingNewCarousel) {
            try {
                const tagsArray = newCarousel.tags.split(',').map(t => t.trim()).filter(Boolean);
                const created = await mediaService.createContent({
                    type: 'carousel',
                    title: newCarousel.title,
                    description: newCarousel.description,
                    slug: newCarousel.slug,
                    tags: tagsArray,
                    status: 'published',
                    metadata: {
                        created_via: 'BulkUploadManager',
                        storage_provider: storageProvider
                    }
                });

                if (created) {
                    finalCarouselId = created.id;
                    // Update list and selection
                    await fetchCarousels();
                    setSelectedCarousel(created.id);
                    setIsCreatingNewCarousel(false);
                } else {
                    throw new Error('Failed to create carousel container');
                }
            } catch (err: any) {
                toast({ title: 'Carousel Creation Failed', description: err.message, variant: 'destructive' });
                setUploading(false);
                return;
            }
        }

        // 2. Sequential processing for atomic SQL stability
        for (const file of stagged) {
            await processFile(file, finalCarouselId);
        }

        setUploading(false);
        toast({ title: 'Cloud Sync Complete', description: `${stagged.length} assets deployed to ${storageProvider.toUpperCase()} and SQL.` });
    };

    // Helpers
    const removeFile = (id: string) => {
        setFiles((prev) => prev.filter((f) => f.id !== id));
    };

    const clearCompleted = () => {
        setFiles((prev) => prev.filter((f) => f.status !== 'success'));
    };

    const getFileIcon = (type: string) => {
        if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
        if (type.startsWith('video/')) return <Video className="h-4 w-4" />;
        if (type.startsWith('audio/')) return <Music className="h-4 w-4" />;
        if (type.includes('pdf')) return <FileText className="h-4 w-4" />;
        return <File className="h-4 w-4" />;
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
                        Advanced B2 Cloud Manager
                        <Badge className="bg-primary/10 text-primary border-0 font-bold uppercase text-[10px]">Go Ham Mode</Badge>
                    </h2>
                    <p className="text-muted-foreground text-sm font-medium">
                        Staged deployment to Backblaze B2 Vault with Automated SQL Metadata Sync.
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
                        B2 Vault
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
                                <Label className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Target Vault Directory</Label>
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
                                        <SelectItem value="resource">Register as Resource Library Item</SelectItem>
                                        <SelectItem value="carousel_item">Attach to Instagram Carousel</SelectItem>
                                        <SelectItem value="storage_only">Cloud Storage Only (B2 Only)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {regMode === 'resource' && (
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Default Category</Label>
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
                                        <Label className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Target Carousel (Media Content)</Label>
                                        <div className="flex items-center gap-2">
                                            <Checkbox 
                                                id="use-shared" 
                                                checked={useSharedMetadata} 
                                                onCheckedChange={(v: any) => setUseSharedMetadata(v)} 
                                            />
                                            <Label htmlFor="use-shared" className="text-[10px] font-bold cursor-pointer">Use Shared Metadata</Label>
                                        </div>
                                    </div>
                                    
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
                                        <SelectTrigger className="rounded-xl border-2 h-12 shadow-ios-inner bg-background/50">
                                            <SelectValue placeholder="Select a Carousel..." />
                                        </SelectTrigger>
                                        <SelectContent className="glass-card">
                                            <SelectItem value="NEW" className="font-bold text-primary italic">+ Add New Carousel</SelectItem>
                                            {carousels.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>{c.title} ({c.slug})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {isCreatingNewCarousel && (
                                        <div className="p-5 rounded-2xl bg-primary/5 border-2 border-primary/20 space-y-4 glass-card shadow-ios-high animate-in zoom-in-95 duration-300">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-[9px] font-black uppercase">Carousel Title</Label>
                                                    <Input 
                                                        value={newCarousel.title}
                                                        onChange={(e) => {
                                                            const title = e.target.value;
                                                            const slug = title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
                                                            setNewCarousel(prev => ({ ...prev, title, slug }));
                                                        }}
                                                        className="rounded-xl h-10 border-muted/30 focus:border-primary/50"
                                                        placeholder="e.g. Constitutional Review 2026"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[9px] font-black uppercase">Slug (Auto-generated)</Label>
                                                    <Input 
                                                        value={newCarousel.slug}
                                                        onChange={(e) => setNewCarousel(prev => ({ ...prev, slug: e.target.value }))}
                                                        className="rounded-xl h-10 border-muted/30 font-mono text-xs bg-muted/20"
                                                        readOnly
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[9px] font-black uppercase">Collection Description (Shared)</Label>
                                                <Textarea 
                                                    value={newCarousel.description}
                                                    onChange={(e) => setNewCarousel(prev => ({ ...prev, description: e.target.value }))}
                                                    className="rounded-xl min-h-[80px] border-muted/30"
                                                    placeholder="Provide context for the entire carousel collection..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[9px] font-black uppercase">Collection Tags (Comma separated)</Label>
                                                <Input 
                                                    value={newCarousel.tags}
                                                    onChange={(e) => setNewCarousel(prev => ({ ...prev, tags: e.target.value }))}
                                                    className="rounded-xl h-10 border-muted/30"
                                                    placeholder="e.g. environmental, special-edition, ceka"
                                                />
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
                    <h3 className="font-black text-lg">Deploy Assets</h3>
                    <p className="text-xs text-muted-foreground mb-4">Click or drop files to stage for cloud upload</p>
                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleFilesSelected(e.target.files)} />
                    <Button variant="outline" className="rounded-xl h-10 px-6 font-bold border-2">Select Files</Button>
                </Card>
            </div>

            {/* Shared Metadata Section - Tactical Override */}
            {useSharedMetadata && files.length > 0 && (
                <Card className="border-0 shadow-ios-high bg-primary/5 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/40" />
                    <CardHeader className="pb-3 border-b border-primary/10">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <PlusCircle className="h-4 w-4" /> Shared Collection Metadata
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Shared Title (Required for Carousel)</Label>
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
                                placeholder="news, alert, 2026"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Shared Description</Label>
                            <Textarea 
                                value={sharedMetadata.description}
                                onChange={(e) => setSharedMetadata(prev => ({ ...prev, description: e.target.value }))}
                                className="rounded-xl border-2 min-h-[48px] h-12 py-3 bg-background/50 shadow-ios-inner"
                                placeholder="Common Context..."
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
                            <CardTitle className="text-lg font-black tracking-tight">Deployment Queue</CardTitle>
                            <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-primary">Stage 2: Metadata Review</CardDescription>
                        </div>
                        <div className="flex gap-3">
                            <Button size="sm" variant="outline" onClick={clearCompleted} className="rounded-xl font-bold h-10 border-2">Clear History</Button>
                            <Button
                                size="sm"
                                onClick={startBatchUpload}
                                disabled={uploading || !backblazeReady}
                                className="rounded-xl h-10 px-6 font-black bg-primary shadow-lg shadow-primary/20"
                            >
                                {uploading ? <CEKALoader variant="ios" size="sm" /> : <Zap className="h-4 w-4 mr-2" />}
                                Sync to B2 & SQL
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
                                            disabled={file.status === 'uploading'}
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

            {/* Help / Context */}
            <Card className="border-0 shadow-lg bg-primary/5">
                <CardContent className="py-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-primary/80 leading-tight italic">
                        <strong>Go Ham Cloud Logic:</strong> When a file is processed, it is staged in the B2 Vault with its custom metadata.
                        Upon success, the specified SQL registrations are triggered synchronously to ensure zero-lag between cloud availability and platform visibility.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};

export default BulkUploadManager;
