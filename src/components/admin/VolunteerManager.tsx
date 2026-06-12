
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
    Users,
    Plus,
    Trash2,
    MapPin,
    Clock,
    Calendar,
    CheckCircle,
    XCircle,
    Clock3,
    Edit2,
    Save,
    X as CloseIcon,
    RefreshCw
} from 'lucide-react';
import { CEKALoader } from '@/components/ui/ceka-loader';
import { motion, AnimatePresence } from 'framer-motion';

interface VolunteerOpportunity {
    id: string;
    title: string;
    description: string;
    organization: string;
    location: string;
    commitment: string;
    date: string;
    type: string;
    category: string;
    skills_required: string[];
    status: 'open' | 'pending' | 'approved' | 'rejected' | 'closed';
    created_at: string;
    updated_at: string;
}

interface VolunteerApplication {
    id: string;
    user_id: string;
    opportunity_id: string;
    status: 'pending' | 'approved' | 'rejected' | 'waitlisted';
    message?: string;
    created_at: string;
    profiles: {
        full_name: string;
        email: string;
        avatar_url?: string;
    };
    volunteer_opportunities: {
        title: string;
        organization: string;
    };
}

const EMPTY_FORM: Partial<VolunteerOpportunity> = {
    title: '',
    description: '',
    organization: '',
    location: '',
    commitment: 'One-time',
    date: '',
    type: 'Volunteer',
    category: 'Local',
    skills_required: [],
    status: 'open'
};

const VolunteerManager = () => {
    const [opportunities, setOpportunities] = useState<VolunteerOpportunity[]>([]);
    const [applications, setApplications] = useState<VolunteerApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingApps, setLoadingApps] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showEditor, setShowEditor] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<Partial<VolunteerOpportunity>>(EMPTY_FORM);
    const [activeTab, setActiveTab] = useState<'opportunities' | 'applications'>('opportunities');
    const { toast } = useToast();

    useEffect(() => {
        loadOpportunities();
        loadApplications();
    }, []);

    const loadApplications = async () => {
        try {
            setLoadingApps(true);
            const { data, error } = await supabase
                .from('volunteer_applications' as any)
                .select('*, profiles(full_name, email, avatar_url), volunteer_opportunities(title, organization)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setApplications((data as any) || []);
        } catch (error) {
            console.error('Error loading applications:', error);
        } finally {
            setLoadingApps(false);
        }
    };

    const loadOpportunities = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('volunteer_opportunities' as any)
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOpportunities((data as any) || []);
        } catch (error) {
            console.error('Error loading opportunities:', error);
            toast({
                title: "Error",
                description: "Failed to load opportunities",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.title || !form.organization || !form.location) {
            toast({ title: "Validation Error", description: "Please fill in all required fields", variant: "destructive" });
            return;
        }

        try {
            setSaving(true);

            if (editingId) {
                // Update existing
                const { error } = await supabase
                    .from('volunteer_opportunities' as any)
                    .update({
                        title: form.title,
                        description: form.description,
                        organization: form.organization,
                        location: form.location,
                        commitment: form.commitment,
                        date: form.date,
                        type: form.type,
                        category: form.category,
                        skills_required: form.skills_required,
                        status: form.status,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editingId);

                if (error) throw error;
                toast({ title: "Success", description: "Opportunity updated successfully" });
            } else {
                // Create new
                const { error } = await supabase
                    .from('volunteer_opportunities' as any)
                    .insert({
                        title: form.title,
                        description: form.description,
                        organization: form.organization,
                        location: form.location,
                        commitment: form.commitment,
                        date: form.date,
                        type: form.type,
                        category: form.category,
                        skills_required: form.skills_required,
                        status: form.status || 'open'
                    });

                if (error) throw error;
                toast({ title: "Success", description: "New opportunity created!" });
            }

            resetForm();
            loadOpportunities();
        } catch (error) {
            console.error('Save error:', error);
            toast({ title: "Error", description: "Failed to save opportunity", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (opp: VolunteerOpportunity) => {
        setForm({
            title: opp.title,
            description: opp.description,
            organization: opp.organization,
            location: opp.location,
            commitment: opp.commitment,
            date: opp.date,
            type: opp.type,
            category: opp.category || 'Local',
            skills_required: opp.skills_required || [],
            status: opp.status
        });
        setEditingId(opp.id);
        setShowEditor(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this opportunity?')) return;

        try {
            const { error } = await supabase
                .from('volunteer_opportunities' as any)
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast({ title: "Deleted", description: "Opportunity removed successfully" });
            loadOpportunities();
        } catch (error) {
            console.error('Delete error:', error);
            toast({ title: "Error", description: "Failed to delete opportunity", variant: "destructive" });
        }
    };

    const handleStatusChange = async (id: string, status: VolunteerOpportunity['status']) => {
        try {
            const { error } = await supabase
                .from('volunteer_opportunities' as any)
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            toast({ title: "Status Updated", description: `Opportunity marked as ${status}` });
            loadOpportunities();
        } catch (error) {
            console.error('Status update error:', error);
            toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
        }
    };

    const handleApplicationStatus = async (id: string, status: 'approved' | 'rejected' | 'waitlisted') => {
        try {
            const { adminService } = await import('@/services/adminService');
            await adminService.updateVolunteerApplicationStatus(id, status);
            toast({ title: "Success", description: `Application ${status}` });
            loadApplications();
        } catch (error) {
            console.error('App status error:', error);
            toast({ title: "Error", description: "Failed to update application", variant: "destructive" });
        }
    };

    const resetForm = () => {
        setForm(EMPTY_FORM);
        setEditingId(null);
        setShowEditor(false);
    };

    const getStatusBadge = (status: VolunteerOpportunity['status']) => {
        const styles: Record<string, string> = {
            open: 'bg-blue-100 text-blue-800',
            approved: 'bg-kenya-green text-white',
            pending: 'bg-yellow-100 text-yellow-800',
            rejected: 'bg-red-100 text-red-800',
            closed: 'bg-gray-100 text-gray-600'
        };
        return <Badge className={styles[status] || 'bg-gray-100'}>{status}</Badge>;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <CEKALoader variant="scanning" size="lg" text="Syncing Volunteer Database..." />
            </div>
        );
    }

    return (
        <div className="space-y-6 container mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Resilience & Service</h2>
                    <p className="text-sm text-muted-foreground">Manage service-learning and community engagement listings</p>
                </div>
                <div className="flex gap-2">
                    <div className="bg-muted/50 p-1 rounded-2xl flex border border-border/50 mr-4">
                        <Button
                            variant={activeTab === 'opportunities' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('opportunities')}
                            className="rounded-xl h-9 px-4 font-bold text-xs"
                        >
                            Tactical Openings
                        </Button>
                        <Button
                            variant={activeTab === 'applications' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('applications')}
                            className="rounded-xl h-9 px-4 font-bold text-xs"
                        >
                            Applicant Queue {applications.filter(a => a.status === 'pending').length > 0 && <Badge className="ml-2 bg-kenya-red text-[8px] h-4 w-4 p-0 flex items-center justify-center">{applications.filter(a => a.status === 'pending').length}</Badge>}
                        </Button>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { loadOpportunities(); loadApplications(); }} className="gap-1 rounded-xl h-11 border-2">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => { resetForm(); setShowEditor(true); }} className="gap-2 rounded-xl h-11 bg-primary shadow-lg shadow-primary/20">
                        <Plus className="h-4 w-4" /> Create Opportunity
                    </Button>
                </div>
            </div>

            {activeTab === 'opportunities' ? (
              <>
                {/* Editor Panel */}
                <AnimatePresence>
                    {showEditor && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <Card className="border-primary/30 bg-primary/5 rounded-[32px]">
                                <CardHeader className="pb-4">
                                    <div className="flex items-center justify-between">
                                        <CardTitle>{editingId ? 'Edit Opening' : 'Forge Tactical Opening'}</CardTitle>
                                        <Button size="icon" variant="ghost" onClick={resetForm}>
                                            <CloseIcon className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Title *</Label>
                                                <Input
                                                    value={form.title || ''}
                                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                                    placeholder="e.g. Youth Voter Registration Drive"
                                                    className="rounded-xl"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Organization *</Label>
                                                <Input
                                                    value={form.organization || ''}
                                                    onChange={e => setForm({ ...form, organization: e.target.value })}
                                                    placeholder="e.g. Kenya Electoral Commission"
                                                    className="rounded-xl"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label>Location *</Label>
                                                <Input
                                                    value={form.location || ''}
                                                    onChange={e => setForm({ ...form, location: e.target.value })}
                                                    placeholder="e.g. Nairobi, Remote, Multiple Locations"
                                                    className="rounded-xl"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Date</Label>
                                                <Input
                                                    type="date"
                                                    value={form.date || ''}
                                                    onChange={e => setForm({ ...form, date: e.target.value })}
                                                    className="rounded-xl"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Commitment</Label>
                                                <Select
                                                    value={form.commitment || 'One-time'}
                                                    onValueChange={v => setForm({ ...form, commitment: v })}
                                                >
                                                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                                    <SelectContent className="rounded-xl">
                                                        <SelectItem value="One-time">One-time</SelectItem>
                                                        <SelectItem value="Weekly">Weekly</SelectItem>
                                                        <SelectItem value="Monthly">Monthly</SelectItem>
                                                        <SelectItem value="Ongoing">Ongoing</SelectItem>
                                                        <SelectItem value="Flexible">Flexible</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Type</Label>
                                                <Select
                                                    value={form.type || 'Volunteer'}
                                                    onValueChange={v => setForm({ ...form, type: v })}
                                                >
                                                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                                    <SelectContent className="rounded-xl">
                                                        <SelectItem value="Volunteer">Volunteer</SelectItem>
                                                        <SelectItem value="Internship">Internship</SelectItem>
                                                        <SelectItem value="Fieldwork">Fieldwork</SelectItem>
                                                        <SelectItem value="Remote">Remote</SelectItem>
                                                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Category Tab (Routing)</Label>
                                                <Select
                                                    value={form.category || 'Local'}
                                                    onValueChange={v => setForm({ ...form, category: v })}
                                                >
                                                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                                    <SelectContent className="rounded-xl">
                                                        <SelectItem value="Local">Local</SelectItem>
                                                        <SelectItem value="Grassroots">Grassroots</SelectItem>
                                                        <SelectItem value="Online">Online</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Skills Required (comma separated)</Label>
                                                <Input
                                                    value={form.skills_required?.join(', ') || ''}
                                                    onChange={e => setForm({ 
                                                        ...form, 
                                                        skills_required: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                                                    })}
                                                    placeholder="e.g. Communication, Data Entry, Design"
                                                    className="rounded-xl"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Status</Label>
                                                <Select
                                                    value={form.status || 'open'}
                                                    onValueChange={v => setForm({ ...form, status: v as any })}
                                                >
                                                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                                    <SelectContent className="rounded-xl">
                                                        <SelectItem value="open">Open</SelectItem>
                                                        <SelectItem value="pending">Pending Review</SelectItem>
                                                        <SelectItem value="approved">Approved</SelectItem>
                                                        <SelectItem value="closed">Closed</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Description</Label>
                                            <Textarea
                                                value={form.description || ''}
                                                onChange={e => setForm({ ...form, description: e.target.value })}
                                                placeholder="Describe the opportunity, responsibilities, and impact..."
                                                className="rounded-xl min-h-[100px]"
                                                rows={3}
                                            />
                                        </div>

                                        <div className="flex justify-end gap-2 pt-4">
                                            <Button type="button" variant="outline" onClick={resetForm} className="rounded-xl">
                                                Abort
                                            </Button>
                                            <Button type="submit" disabled={saving} className="gap-2 rounded-xl bg-primary">
                                                {saving ? <CEKALoader variant="ios" size="sm" /> : <Save className="h-4 w-4" />}
                                                {editingId ? 'Update' : 'Deploy'} Opening
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Opportunities List */}
                <div className="grid gap-4">
                    <AnimatePresence>
                        {opportunities.length === 0 ? (
                            <Card className="py-20 text-center rounded-[32px] border-dashed border-2">
                                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                                <p className="text-muted-foreground font-medium">No tactical openings currently deployed.</p>
                                <Button className="mt-6 rounded-xl" onClick={() => setShowEditor(true)}>
                                    <Plus className="h-4 w-4 mr-2" /> Forge New Opening
                                </Button>
                            </Card>
                        ) : (
                            opportunities.map((opp) => (
                              <motion.div
                                  key={opp.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  layout
                              >
                                  <Card className={`transition-all rounded-[32px] border-none shadow-ios-low hover:shadow-ios-high group ${opp.status === 'pending' ? 'bg-yellow-50/10' : ''}`}>
                                      <CardHeader className="flex flex-row items-start justify-between pb-2">
                                          <div className="space-y-1 flex-1">
                                              <CardTitle className="text-xl font-black">{opp.title}</CardTitle>
                                              <CardDescription className="flex items-center gap-2 flex-wrap font-bold">
                                                  <span className="text-primary">{opp.organization}</span>
                                                  <span className="opacity-30">•</span>
                                                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {opp.location}</span>
                                              </CardDescription>
                                          </div>
                                          <div className="flex items-center gap-2">
                                              {getStatusBadge(opp.status)}
                                          </div>
                                      </CardHeader>
                                      <CardContent>
                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                              <div className="flex items-center gap-2">
                                                  <Clock className="h-4 w-4 text-primary" /> {opp.commitment || 'Flexible'}
                                              </div>
                                              <div className="flex items-center gap-2">
                                                  <Calendar className="h-4 w-4 text-primary" /> {opp.date || 'TBD'}
                                              </div>
                                              <div className="flex items-center gap-2">
                                                  <Users className="h-4 w-4 text-primary" /> {opp.type || 'Volunteer'}
                                              </div>
                                          </div>

                                          {opp.description && (
                                              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-6 leading-relaxed">
                                                  {opp.description}
                                              </p>
                                          )}

                                          <div className="flex items-center gap-3 pt-6 border-t border-slate-50 dark:border-white/5 flex-wrap">
                                              <Button size="sm" variant="outline" onClick={() => handleEdit(opp)} className="rounded-xl h-9 font-bold px-4">
                                                  <Edit2 className="h-3.5 w-3.5 mr-2" /> Modify
                                              </Button>

                                              {opp.status === 'open' && (
                                                  <Button
                                                      size="sm"
                                                      variant="outline"
                                                      onClick={() => handleStatusChange(opp.id, 'closed')}
                                                      className="rounded-xl h-9 font-bold px-4"
                                                  >
                                                      <Clock3 className="h-3.5 w-3.5 mr-2" /> Close Feed
                                                  </Button>
                                              )}

                                              {opp.status === 'closed' && (
                                                  <Button
                                                      size="sm"
                                                      variant="outline"
                                                      onClick={() => handleStatusChange(opp.id, 'open')}
                                                      className="rounded-xl h-9 font-bold px-4"
                                                  >
                                                      <RefreshCw className="h-3.5 w-3.5 mr-2" /> Re-activate
                                                  </Button>
                                              )}

                                              <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  className="text-destructive ml-auto h-9 w-9 p-0"
                                                  onClick={() => handleDelete(opp.id)}
                                              >
                                                  <Trash2 className="h-4 w-4" />
                                              </Button>
                                          </div>
                                      </CardContent>
                                  </Card>
                              </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="space-y-6">
                {/* Applications List */}
                <AnimatePresence>
                  {loadingApps ? (
                    <div className="py-20 flex justify-center"><CEKALoader variant="ios" /></div>
                  ) : applications.length === 0 ? (
                    <Card className="py-20 text-center rounded-[32px] border-dashed border-2">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                        <p className="text-muted-foreground font-medium">No volunteer applications in the queue.</p>
                    </Card>
                  ) : (
                    <div className="grid gap-4">
                      {applications.map(app => (
                        <Card key={app.id} className="rounded-[32px] border-none shadow-ios-low overflow-hidden">
                          <CardHeader className="flex flex-row items-center justify-between pb-2">
                             <div className="flex items-center gap-4">
                               <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400">
                                 {app.profiles?.full_name?.charAt(0)}
                               </div>
                               <div>
                                 <h4 className="font-black text-lg">{app.profiles?.full_name}</h4>
                                 <p className="text-xs font-bold text-primary tracking-widest uppercase">{app.volunteer_opportunities?.title}</p>
                               </div>
                             </div>
                             <Badge variant={app.status === 'pending' ? 'outline' : 'secondary'} className={`rounded-xl px-3 h-7 ${app.status === 'approved' ? 'bg-kenya-green text-white border-none' : ''}`}>
                               {app.status}
                             </Badge>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-slate-600 mb-4 bg-muted/30 p-4 rounded-2xl border border-border/20 italic">
                              "{app.message || 'No message provided'}"
                            </p>
                            <div className="flex items-center gap-3 pt-2">
                               <Button
                                 size="sm"
                                 className="rounded-xl h-10 px-6 font-bold bg-kenya-green"
                                 onClick={() => handleApplicationStatus(app.id, 'approved')}
                                 disabled={app.status === 'approved'}
                               >
                                 Approve Applicant
                               </Button>
                               <Button
                                 size="sm"
                                 variant="outline"
                                 className="rounded-xl h-10 px-6 font-bold"
                                 onClick={() => handleApplicationStatus(app.id, 'waitlisted')}
                                 disabled={app.status === 'waitlisted'}
                               >
                                 Waitlist
                               </Button>
                               <Button
                                 size="sm"
                                 variant="ghost"
                                 className="rounded-xl h-10 px-6 font-bold text-destructive"
                                 onClick={() => handleApplicationStatus(app.id, 'rejected')}
                               >
                                 Decline
                               </Button>
                               <div className="ml-auto text-[10px] font-bold text-muted-foreground uppercase opacity-50">
                                 Received: {new Date(app.created_at).toLocaleDateString()}
                               </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </div>
            )}
        </div>
    );
};

export default VolunteerManager;
