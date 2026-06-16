import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Hash, Shield, Users, CheckCircle2, ChevronRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Room {
    id: string;
    name: string;
    type: 'public' | 'private' | 'direct';
}

interface JoinRoomGuideProps {
    isOpen: boolean;
    onClose: () => void;
    roomName: string;
    rooms: Room[];
    onSelectRoom: (roomId: string) => void;
    currentRoomId: string;
}

type Step = 'select' | 'confirm';

const JoinRoomGuide: React.FC<JoinRoomGuideProps> = ({
    isOpen,
    onClose,
    roomName,
    rooms,
    onSelectRoom,
    currentRoomId,
}) => {
    const [step, setStep] = useState<Step>('select');
    const [selectedRoomId, setSelectedRoomId] = useState<string>(currentRoomId);
    const [selectedRoomName, setSelectedRoomName] = useState<string>(roomName);

    const handleRoomPick = (room: Room) => {
        setSelectedRoomId(room.id);
        setSelectedRoomName(room.name);
        setStep('confirm');
    };

    const handleConfirm = () => {
        onSelectRoom(selectedRoomId);
        onClose();
        setStep('select');
    };

    const handleBack = () => {
        setStep('select');
    };

    const handleClose = () => {
        onClose();
        setStep('select');
    };

    const publicRooms = rooms.filter(r => r.type === 'public' || r.type === undefined);

    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
                    onClick={handleClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 20 }}
                        transition={{ type: 'spring', damping: 24, stiffness: 260 }}
                        className="bg-white dark:bg-[#1C1C1E] rounded-[32px] shadow-2xl w-full max-w-md mx-4 overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <AnimatePresence mode="wait">
                            {step === 'select' ? (
                                <motion.div
                                    key="select"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.18 }}
                                >
                                    {/* Header */}
                                    <div className="px-7 pt-8 pb-4">
                                        <div className="w-14 h-14 rounded-[18px] bg-primary/10 flex items-center justify-center mb-5">
                                            <Hash className="h-7 w-7 text-primary" />
                                        </div>
                                        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mb-1">
                                            Pick a room
                                        </h2>
                                        <p className="text-sm text-muted-foreground">
                                            Choose where you'd like to start the conversation.
                                        </p>
                                    </div>

                                    {/* Room list */}
                                    <div className="px-4 pb-4 space-y-1 max-h-[320px] overflow-y-auto">
                                        {publicRooms.length === 0 && (
                                            <div className="text-center py-10 text-muted-foreground text-sm">
                                                No rooms available yet.
                                            </div>
                                        )}
                                        {publicRooms.map(room => {
                                            const isCurrent = room.id === currentRoomId;
                                            return (
                                                <button
                                                    key={room.id}
                                                    onClick={() => handleRoomPick(room)}
                                                    className={cn(
                                                        'w-full flex items-center gap-4 p-4 rounded-[18px] transition-all duration-200 group text-left',
                                                        isCurrent
                                                            ? 'bg-primary/10 ring-1 ring-primary/20'
                                                            : 'hover:bg-slate-100 dark:hover:bg-white/5'
                                                    )}
                                                >
                                                    <div className={cn(
                                                        'h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors',
                                                        isCurrent ? 'bg-primary/20' : 'bg-slate-100 dark:bg-white/5 group-hover:bg-primary/10'
                                                    )}>
                                                        <Hash className={cn('h-5 w-5', isCurrent ? 'text-primary' : 'text-muted-foreground group-hover:text-primary')} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold truncate text-slate-900 dark:text-white">{room.name}</p>
                                                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
                                                            {isCurrent ? 'Current room' : 'Public room'}
                                                        </p>
                                                    </div>
                                                    <ChevronRight className={cn(
                                                        'h-4 w-4 shrink-0 transition-colors',
                                                        isCurrent ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
                                                    )} />
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Footer */}
                                    <div className="px-7 pb-7 pt-2">
                                        <Button
                                            variant="ghost"
                                            className="w-full rounded-2xl h-12 text-xs font-bold uppercase tracking-widest text-muted-foreground"
                                            onClick={handleClose}
                                        >
                                            Skip for now
                                        </Button>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="confirm"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.18 }}
                                >
                                    {/* Back nav */}
                                    <div className="px-5 pt-5">
                                        <button
                                            onClick={handleBack}
                                            className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest"
                                        >
                                            <ArrowLeft className="h-3.5 w-3.5" /> All rooms
                                        </button>
                                    </div>

                                    {/* Content */}
                                    <div className="px-7 pt-4 pb-4">
                                        <div className="w-14 h-14 rounded-[18px] bg-primary/10 flex items-center justify-center mb-5">
                                            <CheckCircle2 className="h-7 w-7 text-primary" />
                                        </div>
                                        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mb-1">
                                            Join #{selectedRoomName}
                                        </h2>
                                        <p className="text-sm text-muted-foreground mb-6">
                                            This is a public room. Your messages are visible to all members. Keep the discussion
                                            respectful and on-topic.
                                        </p>

                                        <div className="space-y-3 mb-6">
                                            {[
                                                { icon: Users, label: 'Be civil', sub: 'Treat fellow citizens with respect' },
                                                { icon: Shield, label: 'Stay on topic', sub: 'Keep discussions relevant to civic issues' },
                                                { icon: Hash, label: 'Real-time sync', sub: 'Messages appear instantly for everyone' },
                                            ].map(({ icon: Icon, label, sub }) => (
                                                <div key={label} className="flex items-start gap-3 p-3.5 rounded-[16px] bg-slate-50 dark:bg-white/5">
                                                    <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                                        <Icon className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-900 dark:text-white">{label}</p>
                                                        <p className="text-[11px] text-muted-foreground">{sub}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <Button
                                            onClick={handleConfirm}
                                            className="w-full rounded-2xl h-12 font-bold text-sm"
                                        >
                                            Join #{selectedRoomName}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="w-full rounded-2xl h-10 text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2"
                                            onClick={handleClose}
                                        >
                                            Skip for now
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default JoinRoomGuide;