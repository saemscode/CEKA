
import React, { useState, useEffect, useRef } from 'react';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
  eachDayOfInterval,
  isPast,
  isToday
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Download, ExternalLink, Plus, Share2, HandHeart, Filter, MapPin, Globe, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import gsap from 'gsap';
import { createEvent as createIcs } from 'ics';
import { CEKALoader } from '@/components/ui/ceka-loader';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';

interface CivicEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  category?: string;
  color?: string;
  location?: string;
  is_online?: boolean;
  source?: string;
  status?: string;
}

const KENYA_COUNTIES = [
  'All Counties', 'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Kiambu',
  'Machakos', 'Kajiado', 'Kilifi', 'Uasin Gishu', 'Meru', 'Nyeri'
];

const EVENT_CATEGORIES = [
  'All', 'Civic Forum', 'Workshop', 'Rally', 'Training', 'Debate', 'Town Hall',
  'Community Service', 'Legal Clinic', 'Voter Education', 'Other'
];

const EventsCalendar = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'list'>('month');
  const [events, setEvents] = useState<CivicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const flourishRef = useRef<HTMLDivElement>(null);

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [countyFilter, setCountyFilter] = useState<string>('All Counties');

  // RSVP state
  const [rsvpEvents, setRsvpEvents] = useState<Set<string>>(new Set());
  const [rsvpLoading, setRsvpLoading] = useState<string | null>(null);

  // Event submission state
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '', description: '', event_date: '', start_time: '09:00', end_time: '10:00',
    category: 'Civic Forum', location: '', is_online: false
  });

  useEffect(() => {
    fetchEvents();
  }, [currentMonth]);

  useEffect(() => {
    if (user) fetchUserRsvps();
  }, [user]);

  useEffect(() => {
    if (flourishRef.current) {
      gsap.fromTo(flourishRef.current,
        { scaleX: 0, opacity: 0 },
        { scaleX: 1, opacity: 1, duration: 0.4, ease: "back.out(1.7)" }
      );
    }
  }, [selectedDate]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const start = startOfMonth(currentMonth).toISOString();
      const end = endOfMonth(currentMonth).toISOString();

      const { data, error } = await supabase
        .from('civic_events')
        .select('*')
        .gte('event_date', start)
        .lte('event_date', end);

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRsvps = async () => {
    try {
      if (!user) return;
      const { data } = await (supabase.from('chat_interactions') as any)
        .select('target_id')
        .eq('user_id', user.id)
        .eq('target_type', 'civic_event')
        .eq('action_type', 'rsvp');
      if (data) {
        setRsvpEvents(new Set(data.map((d: any) => d.target_id)));
      }
    } catch {}
  };

  const handleRsvp = async (eventId: string) => {
    if (!user) {
      toast({ title: 'Sign in Required', description: 'Please sign in to RSVP for events.', variant: 'destructive' });
      return;
    }
    setRsvpLoading(eventId);
    try {
      if (rsvpEvents.has(eventId)) {
        // Un-RSVP
        await (supabase.from('chat_interactions') as any)
          .delete()
          .eq('user_id', user.id)
          .eq('target_id', eventId)
          .eq('target_type', 'civic_event')
          .eq('action_type', 'rsvp');
        setRsvpEvents(prev => { const next = new Set(prev); next.delete(eventId); return next; });
        toast({ title: 'RSVP Cancelled' });
      } else {
        await (supabase.from('chat_interactions') as any).insert({
          user_id: user.id,
          target_id: eventId,
          target_type: 'civic_event',
          action_type: 'rsvp'
        });
        setRsvpEvents(prev => new Set(prev).add(eventId));
        toast({ title: "✅ RSVP'd!", description: 'You\'ll be reminded before the event.' });
      }
    } catch (err) {
      console.error('RSVP error:', err);
    } finally {
      setRsvpLoading(null);
    }
  };

  const handleShareEvent = async (event: CivicEvent) => {
    const shareData = {
      title: event.title,
      text: `${event.title} — ${format(new Date(event.event_date), 'EEEE, MMM do yyyy')}${event.start_time ? ` at ${event.start_time}` : ''}`,
      url: `${window.location.origin}/calendar?date=${event.event_date}`
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        toast({ title: 'Link Copied', description: 'Event link copied to clipboard.' });
      }
    } catch {}
  };

  const handleSubmitEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.event_date || !newEvent.description.trim()) {
      toast({ title: 'Missing Fields', description: 'Title, date, and description are required.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('civic_events').insert({
        title: newEvent.title.trim(),
        description: newEvent.description.trim(),
        event_date: new Date(newEvent.event_date).toISOString(),
        start_time: newEvent.start_time,
        end_time: newEvent.end_time,
        category: newEvent.category,
        source: 'community',
        status: 'pending'
      } as any);
      if (error) throw error;
      toast({ title: 'Event Submitted!', description: 'Your event has been submitted for review.' });
      setSubmitDialogOpen(false);
      setNewEvent({ title: '', description: '', event_date: '', start_time: '09:00', end_time: '10:00', category: 'Civic Forum', location: '', is_online: false });
      fetchEvents();
    } catch (err) {
      console.error('Event submission error:', err);
      toast({ title: 'Submission Failed', description: 'Could not submit the event. Try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEvents = events.filter(event => {
    if (categoryFilter !== 'All' && event.category !== categoryFilter) return false;
    if (formatFilter === 'online' && !event.is_online) return false;
    if (formatFilter === 'in-person' && event.is_online) return false;
    if (countyFilter !== 'All Counties' && event.location?.indexOf(countyFilter) === -1) return false;
    return true;
  });

  const selectedDateEvents = filteredEvents.filter(event =>
    isSameDay(new Date(event.event_date), selectedDate)
  );

  const weekDays = eachDayOfInterval({
    start: startOfWeek(selectedDate),
    end: endOfWeek(selectedDate)
  });

  const upcomingEvents = filteredEvents
    .filter(e => !isPast(new Date(e.event_date)) || isToday(new Date(e.event_date)))
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

  useEffect(() => {
    // Stagger animation for event cards
    if (!loading && selectedDateEvents.length > 0) {
      gsap.fromTo(".event-card",
        { opacity: 0, x: 20 },
        { opacity: 1, x: 0, duration: 0.4, stagger: 0.1, ease: "power2.out" }
      );
    }
  }, [loading, selectedDateEvents.length, selectedDate]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const daysInMonth = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth)),
    end: endOfWeek(endOfMonth(currentMonth))
  });

  const downloadIcs = (event: CivicEvent) => {
    const date = new Date(event.event_date);
    const [hours, minutes] = (event.start_time || '09:00').split(':').map(Number);

    const icsEvent = {
      start: [date.getFullYear(), date.getMonth() + 1, date.getDate(), hours, minutes] as [number, number, number, number, number],
      duration: { hours: 1 },
      title: event.title,
      description: event.description,
      location: 'Kenya',
      url: window.location.href,
      categories: [event.category || 'Civic'],
    };

    createIcs(icsEvent, (error, value) => {
      if (error) return console.error(error);
      const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${event.title.replace(/\s+/g, '_')}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  const getGoogleCalendarUrl = (event: CivicEvent) => {
    const dateStr = format(new Date(event.event_date), 'yyyyMMdd');
    const startTime = (event.start_time || '09:00').replace(':', '') + '00';
    const endTime = (event.end_time || '10:00').replace(':', '') + '00';

    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${dateStr}T${startTime}Z/${dateStr}T${endTime}Z&details=${encodeURIComponent(event.description)}&location=Kenya`;
  };

  return (
    <Layout>
      <div className="container py-8 max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gradient-gold">Events Calendar</h1>
            <p className="text-muted-foreground mt-1">Join our civic engagement activities across Kenya</p>
          </div>

          <div className="flex items-center gap-3">
            <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-2xl gap-2 bg-kenya-green hover:bg-kenya-green/90 shadow-ios-medium font-bold text-xs px-4 h-10">
                  <Plus className="h-4 w-4" />
                  Submit Event
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg rounded-3xl border-border/50 shadow-ios-high">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">Submit a Community Event</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="event-title" className="font-bold text-xs">Event Title *</Label>
                    <Input
                      id="event-title"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Community Town Hall Meeting"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-desc" className="font-bold text-xs">Description *</Label>
                    <Textarea
                      id="event-desc"
                      value={newEvent.description}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe the event, its purpose, and what attendees can expect..."
                      className="rounded-xl min-h-[80px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="event-date" className="font-bold text-xs">Event Date *</Label>
                      <Input
                        id="event-date"
                        type="date"
                        value={newEvent.event_date}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, event_date: e.target.value }))}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event-category" className="font-bold text-xs">Category</Label>
                      <Select value={newEvent.category} onValueChange={(v) => setNewEvent(prev => ({ ...prev, category: v }))}>
                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {EVENT_CATEGORIES.filter(c => c !== 'All').map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="event-start" className="font-bold text-xs">Start Time</Label>
                      <Input
                        id="event-start"
                        type="time"
                        value={newEvent.start_time}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, start_time: e.target.value }))}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event-end" className="font-bold text-xs">End Time</Label>
                      <Input
                        id="event-end"
                        type="time"
                        value={newEvent.end_time}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, end_time: e.target.value }))}
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-location" className="font-bold text-xs">Location</Label>
                    <Input
                      id="event-location"
                      value={newEvent.location}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Venue name or online link"
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost" className="rounded-xl">Cancel</Button>
                  </DialogClose>
                  <Button
                    onClick={handleSubmitEvent}
                    disabled={submitting}
                    className="rounded-xl bg-kenya-green hover:bg-kenya-green/90 font-bold"
                  >
                    {submitting ? 'Submitting...' : 'Submit for Review'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-2xl border border-border/50 backdrop-blur-sm">
              <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-xl hover:bg-background shadow-sm transition-all">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="px-4 font-semibold min-w-[140px] text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </div>
              <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-xl hover:bg-background shadow-sm transition-all">
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2">
            <Filter className="h-4 w-4" />
            <span className="font-semibold text-xs uppercase tracking-wider">Filters</span>
          </div>

          <div className="flex bg-muted/30 p-1 rounded-2xl border border-border/50 backdrop-blur-sm mr-2">
            <Button
              variant={viewMode === 'month' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('month')}
              className="rounded-xl h-8 px-3 text-xs font-bold"
            >
              Month
            </Button>
            <Button
              variant={viewMode === 'week' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('week')}
              className="rounded-xl h-8 px-3 text-xs font-bold"
            >
              Week
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-xl h-8 px-3 text-xs font-bold"
            >
              List
            </Button>
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[150px] rounded-2xl h-9 text-xs font-medium border-border/50">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {EVENT_CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={countyFilter} onValueChange={setCountyFilter}>
            <SelectTrigger className="w-[150px] rounded-2xl h-9 text-xs font-medium border-border/50">
              <SelectValue placeholder="County" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {KENYA_COUNTIES.map(county => (
                <SelectItem key={county} value={county} className="text-xs">{county}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={formatFilter} onValueChange={setFormatFilter}>
            <SelectTrigger className="w-[140px] rounded-2xl h-9 text-xs font-medium border-border/50">
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="text-xs">All Formats</SelectItem>
              <SelectItem value="in-person" className="text-xs"><span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> In-Person</span></SelectItem>
              <SelectItem value="online" className="text-xs"><span className="flex items-center gap-1.5"><Globe className="h-3 w-3" /> Online</span></SelectItem>
            </SelectContent>
          </Select>

          {(categoryFilter !== 'All' || formatFilter !== 'all' || countyFilter !== 'All Counties') && (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl text-xs h-9"
              onClick={() => { setCategoryFilter('All'); setFormatFilter('all'); setCountyFilter('All Counties'); }}
            >
              Clear
            </Button>
          )}
        </div>

        <div className="grid lg:grid-cols-7 gap-8">
          {/* Calendar Grid */}
          <div className="lg:col-span-4 bg-card rounded-3xl border border-border/50 shadow-ios-high overflow-hidden self-start">
            {viewMode === 'month' && (
              <>
                <div className="grid grid-cols-7 border-b border-border/30 bg-muted/10">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="py-4 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7">
                  {daysInMonth.map((day, idx) => {
                    const isSelected = isSameDay(day, selectedDate);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const hasEvents = filteredEvents.some(e => isSameDay(new Date(e.event_date), day));
                    const dayIsPast = isPast(day) && !isToday(day);

                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(day)}
                        className={`
                          relative aspect-square p-2 border-r border-b border-border/20 transition-all duration-300
                          flex flex-col items-center justify-center group
                          ${!isCurrentMonth ? 'opacity-20' : dayIsPast ? 'opacity-40' : 'opacity-100'}
                          ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'}
                        `}
                      >
                        <span
                          className={`
                            z-10 text-sm font-medium transition-colors
                            ${isSelected ? 'text-primary' : 'text-foreground'}
                            ${isSameDay(day, new Date()) && !isSelected ? 'bg-kenya-red text-white w-7 h-7 flex items-center justify-center rounded-full' : ''}
                          `}
                        >
                          {format(day, 'd')}
                        </span>

                        {isSelected && (
                          <div
                            ref={flourishRef}
                            className="absolute bottom-2 w-6 h-1 bg-primary rounded-full origin-center"
                          />
                        )}

                        {hasEvents && !isSelected && (
                          <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-kenya-green rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {viewMode === 'week' && (
              <div className="divide-y divide-border/30">
                {weekDays.map(day => {
                  const dayEvents = filteredEvents.filter(e => isSameDay(new Date(e.event_date), day));
                  const isSelected = isSameDay(day, selectedDate);
                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={`p-4 cursor-pointer transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{format(day, 'EEEE')}</p>
                          <p className={`text-xl font-black ${isToday(day) ? 'text-kenya-red' : ''}`}>{format(day, 'MMM do')}</p>
                        </div>
                        {dayEvents.length > 0 && <Badge className="bg-kenya-green/10 text-kenya-green border-none">{dayEvents.length} Events</Badge>}
                      </div>
                      <div className="mt-3 flex gap-1.5 flex-wrap">
                        {dayEvents.map(e => <div key={e.id} className="h-1.5 w-1.5 rounded-full bg-primary" />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {viewMode === 'list' && (
              <div className="max-h-[600px] overflow-y-auto no-scrollbar">
                {upcomingEvents.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">No upcoming events found.</div>
                ) : (
                  upcomingEvents.map(event => (
                    <div
                      key={event.id}
                      onClick={() => setSelectedDate(new Date(event.event_date))}
                      className="p-6 border-b border-border/30 hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 text-primary p-3 rounded-2xl text-center min-w-[70px]">
                          <p className="text-[10px] font-bold uppercase">{format(new Date(event.event_date), 'MMM')}</p>
                          <p className="text-xl font-black">{format(new Date(event.event_date), 'dd')}</p>
                        </div>
                        <div>
                          <Badge variant="outline" className="text-[8px] uppercase font-bold tracking-widest mb-1">{event.category}</Badge>
                          <h4 className="font-bold leading-tight">{event.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{event.start_time || 'All Day'} • {event.location || (event.is_online ? 'Online' : 'Kenya')}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Day Details */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                {format(selectedDate, 'EEEE, MMM do')}
              </h2>
              {selectedDateEvents.length > 0 && (
                <Badge className="bg-primary/10 text-primary border-none">
                  {selectedDateEvents.length} {selectedDateEvents.length === 1 ? 'Event' : 'Events'}
                </Badge>
              )}
            </div>

            <div className="space-y-4 min-h-[300px]">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <CEKALoader variant="scanning" size="md" text="Scanning Events..." />
                </div>
              ) : selectedDateEvents.length > 0 ? (
                selectedDateEvents.map((event, idx) => {
                  const eventIsPast = isPast(new Date(event.event_date)) && !isToday(new Date(event.event_date));
                  const isRsvpd = rsvpEvents.has(event.id);

                  return (
                    <Card
                      key={event.id}
                      className={`event-card overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-all group rounded-2xl opacity-0
                        ${eventIsPast ? 'opacity-60' : ''}
                      `}
                    >
                      <CardContent className="p-5">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest text-primary border-primary/20">
                              {event.category || 'Civic'}
                            </Badge>
                            {eventIsPast && (
                              <Badge variant="secondary" className="text-[9px] uppercase font-bold tracking-widest bg-muted/60">
                                Past Event
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-lg">
                            {event.start_time || 'All Day'}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">{event.title}</h3>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{event.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {!eventIsPast && (
                            <Button
                              size="sm"
                              className={`text-[10px] h-8 rounded-xl gap-1.5 font-bold transition-all ${
                                isRsvpd
                                  ? 'bg-kenya-green/10 text-kenya-green border border-kenya-green/30 hover:bg-Kenya-green/20'
                                  : 'bg-kenya-green text-white hover:bg-kenya-green/90 shadow-ios-light'
                              }`}
                              onClick={() => handleRsvp(event.id)}
                              disabled={rsvpLoading === event.id}
                            >
                              {isRsvpd ? <><Check className="h-3 w-3" /> RSVP'd</> : <><HandHeart className="h-3 w-3" /> RSVP</>}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[10px] h-8 rounded-xl gap-1.5 hover:bg-primary/5 hover:text-primary hover:border-primary/30"
                            onClick={() => downloadIcs(event)}
                          >
                            <Download className="h-3 w-3" />
                            iCalendar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[10px] h-8 rounded-xl gap-1.5 hover:bg-blue-500/5 hover:text-blue-500 hover:border-blue-500/30"
                            asChild
                          >
                            <a href={getGoogleCalendarUrl(event)} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3" />
                              Google Calendar
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[10px] h-8 rounded-xl gap-1.5"
                            onClick={() => handleShareEvent(event)}
                          >
                            <Share2 className="h-3 w-3" />
                            Share
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <div className="bg-muted/10 rounded-3xl border border-dashed border-border/50 p-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-muted/30 rounded-2xl flex items-center justify-center mb-4">
                    <CalendarIcon className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="font-bold text-lg">No Events Scheduled</h3>
                  <p className="text-sm text-muted-foreground max-w-[200px] mt-2">
                    Check back later for activities on this date.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default EventsCalendar;
