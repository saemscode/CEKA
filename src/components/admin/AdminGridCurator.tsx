import React, { useState, useEffect } from 'react';
import { mediaService } from '@/services/mediaService';
import { type MediaContent } from '@/services/mediaService';
import { useToast } from '@/hooks/use-toast';
import { CEKALoader } from '@/components/ui/ceka-loader';
import { Button } from '@/components/ui/button';
import { Save, LayoutGrid, Info, Check, RefreshCw, Smartphone, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GridItem = ({ item, index, layoutPrefix, draggedIdx, handleDragStart, handleDragEnter, handleDragOver, handleDragEnd }: any) => {
    return (
        <motion.div
            layout
            layoutId={`${layoutPrefix}-${item.id}`}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnter={(e) => handleDragEnter(e, index)}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            className={`aspect-[4/5] relative group cursor-grab active:cursor-grabbing overflow-hidden bg-muted/20 border border-white/5 shadow-lg will-change-transform ${draggedIdx === index ? 'opacity-0 scale-95' : 'hover:scale-[1.02] hover:shadow-2xl hover:z-10 transition-transform duration-200'} ${layoutPrefix === 'desktop' ? 'rounded-xl' : ''}`}
        >
            <img
                src={item.cover_url || item.items?.[0]?.file_url}
                alt={item.title}
                className="w-full h-full object-cover pointer-events-none"
                draggable={false}
            />
            
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-2 pointer-events-none backdrop-blur-[2px]">
                <LayoutGrid className="text-white/80 mb-2" size={layoutPrefix === 'desktop' ? 24 : 16} />
                <p className="text-white text-[8px] md:text-[10px] font-black text-center uppercase tracking-tight leading-tight line-clamp-3">
                    {item.title}
                </p>
            </div>

            <div className="absolute top-1 left-1 w-5 h-5 md:w-6 md:h-6 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-[8px] md:text-[10px] font-black text-white pointer-events-none shadow-xl">
                {index + 1}
            </div>
            
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-sm bg-black/60 backdrop-blur-md border border-white/10 text-[6px] md:text-[8px] font-bold text-white/80 pointer-events-none">
                {new Date(item.created_at || '').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </div>
        </motion.div>
    );
};

export const AdminGridCurator = () => {
    const [items, setItems] = useState<MediaContent[]>([]);
    const [originalItems, setOriginalItems] = useState<MediaContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
    const { toast } = useToast();

    const fetchItems = async () => {
        setLoading(true);
        try {
            // Fetch the top 50 posts to curate
            const data = await mediaService.listMediaContent('carousel', 1, 50);
            setItems(data);
            setOriginalItems(JSON.parse(JSON.stringify(data))); // Deep copy for change detection
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to load grid content', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const hasChanges = JSON.stringify(items.map(i => i.id)) !== JSON.stringify(originalItems.map(i => i.id));

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIdx(index);
        e.dataTransfer.effectAllowed = 'move';
        // Setting data is required for Firefox to trigger drag events
        e.dataTransfer.setData('text/plain', index.toString());
        
        // Hide the default HTML5 ghost image if possible
        const dragImage = new Image();
        dragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        e.dataTransfer.setDragImage(dragImage, 0, 0);
    };

    const handleDragEnter = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIdx === null || draggedIdx === index) return;

        const newItems = [...items];
        const draggedItem = newItems[draggedIdx];
        newItems.splice(draggedIdx, 1);
        newItems.splice(index, 0, draggedItem);
        
        setItems(newItems);
        setDraggedIdx(index);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDragEnd = () => {
        setDraggedIdx(null);
    };

    const handleSave = async () => {
        setSaving(true);
        // The first item should have the highest display_order
        // We will assign display_order based on epoch time to ensure large gaps, 
        // or simply a descending integer sequence starting from the current epoch.
        const baseOrder = Date.now();
        const updates = items.map((item, index) => ({
            id: item.id,
            display_order: baseOrder - index // Highest index gets lowest score
        }));

        try {
            await mediaService.updateDisplayOrder(updates);
            setOriginalItems(JSON.parse(JSON.stringify(items)));
            toast({ title: 'Grid Saved!', description: 'Public feed is now synced with your visual arrangement.' });
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to update grid layout.', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setItems(JSON.parse(JSON.stringify(originalItems)));
        setDraggedIdx(null);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <CEKALoader variant="scanning" size="lg" />
                <p className="mt-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Loading Grid...</p>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-3xl opacity-50 bg-muted/5">
                <p className="font-bold">No carousel media found to curate.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-muted/20 p-6 rounded-3xl border border-white/5 shadow-inner">
                <div className="space-y-1">
                    <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                        <LayoutGrid className="text-primary" /> Visual Grid Curator
                    </h2>
                    <p className="text-xs text-muted-foreground font-bold tracking-wide max-w-md">
                        Drag and drop carousels to paint your perfect public aesthetic. The order here exactly mirrors what users see on their mobile devices.
                    </p>
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <AnimatePresence>
                        {hasChanges && (
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                                <Button onClick={handleReset} variant="outline" className="rounded-xl gap-2 font-black border-2 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20">
                                    <RefreshCw size={16} /> Discard
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    <Button 
                        onClick={handleSave} 
                        disabled={saving || !hasChanges} 
                        className={`w-full md:w-auto rounded-xl gap-2 font-black transition-all ${hasChanges ? 'bg-kenya-green hover:bg-kenya-green/90 text-white shadow-xl shadow-kenya-green/20' : 'bg-muted text-muted-foreground'}`}
                    >
                        {saving ? <CEKALoader size="xs" /> : (hasChanges ? <Save size={16} /> : <Check size={16} />)} 
                        {saving ? 'Syncing...' : (hasChanges ? 'Publish Grid' : 'Grid Up to Date')}
                    </Button>
                </div>
            </div>

            {hasChanges && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-3 rounded-xl flex items-center gap-2 text-xs font-bold shadow-lg"
                >
                    <Info size={16} className="shrink-0" />
                    Unsaved layout changes. Hit "Publish Grid" to make it live.
                </motion.div>
            )}

            <div className="flex flex-col lg:flex-row gap-8 items-start pt-4">
                
                {/* ── MOBILE FRAME ── */}
                <div className="w-full lg:w-[360px] xl:w-[390px] shrink-0 mx-auto">
                    <div className="flex items-center justify-center gap-2 mb-4 text-xs font-black uppercase tracking-widest text-muted-foreground">
                        <Smartphone size={16} /> Mobile View (3 Columns)
                    </div>
                    
                    {/* Fake iPhone chassis */}
                    <div className="relative border-[10px] md:border-[14px] border-black/90 dark:border-white/10 rounded-[2.5rem] md:rounded-[3.5rem] bg-background shadow-2xl overflow-hidden h-[750px] flex flex-col">
                        {/* Notch */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40%] h-[25px] bg-black/90 dark:bg-white/10 rounded-b-3xl z-20" />
                        
                        {/* Inner Grid */}
                        <div className="flex-1 overflow-y-auto p-1 pt-8 hide-scrollbar">
                            <div className="grid grid-cols-3 gap-0.5">
                                <AnimatePresence>
                                    {items.map((item, index) => (
                                        <GridItem 
                                            key={`mobile-${item.id}`}
                                            item={item} 
                                            index={index} 
                                            layoutPrefix="mobile"
                                            draggedIdx={draggedIdx}
                                            handleDragStart={handleDragStart}
                                            handleDragEnter={handleDragEnter}
                                            handleDragOver={handleDragOver}
                                            handleDragEnd={handleDragEnd}
                                        />
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── DESKTOP FRAME ── */}
                <div className="flex-1 w-full hidden md:block">
                    <div className="flex items-center justify-center gap-2 mb-4 text-xs font-black uppercase tracking-widest text-muted-foreground">
                        <Monitor size={16} /> Desktop View (4-5 Columns)
                    </div>
                    
                    <div className="bg-muted/10 border border-white/5 shadow-inner rounded-[2rem] p-4 lg:p-6 overflow-hidden">
                        <div className="grid grid-cols-4 xl:grid-cols-5 gap-1.5 lg:gap-2">
                            <AnimatePresence>
                                {items.map((item, index) => (
                                    <GridItem 
                                        key={`desktop-${item.id}`}
                                        item={item} 
                                        index={index} 
                                        layoutPrefix="desktop"
                                        draggedIdx={draggedIdx}
                                        handleDragStart={handleDragStart}
                                        handleDragEnter={handleDragEnter}
                                        handleDragOver={handleDragOver}
                                        handleDragEnd={handleDragEnd}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
