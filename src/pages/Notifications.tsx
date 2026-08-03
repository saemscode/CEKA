// ============================================================
// FILE: src/pages/Notifications.jsx (UPDATED)
// ============================================================
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, CheckCheck, Clock, Calendar, FileText, Filter } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/providers/AuthProvider';
import { useNavigate } from 'react-router-dom';

import LineSidebar from '@/components/ui/LineSidebar';
import FlowingMenu from '@/components/ui/FlowingMenu';
import SpecularButton from '@/components/ui/SpecularButton';

const NOTIFICATION_CATEGORIES = ['All', 'Unread', 'Bills', 'Events', 'System'];

const Notifications = () => {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, refetch } = useNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState(0);
  const [filteredNotifications, setFilteredNotifications] = useState([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth', { state: { from: '/notifications' } });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!notifications) return;
    const category = NOTIFICATION_CATEGORIES[activeCategory];
    let filtered = notifications;
    if (category === 'Unread') {
      filtered = notifications.filter(n => !n.is_read);
    } else if (category === 'Bills') {
      filtered = notifications.filter(n => (n as any).type === 'bill_update');
    } else if (category === 'Events') {
      filtered = notifications.filter(n => (n as any).type === 'event');
    } else if (category === 'System') {
      filtered = notifications.filter(n => !(n as any).type || (n as any).type === 'system');
    }
    setFilteredNotifications(filtered);
  }, [notifications, activeCategory]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getNotificationIcon = (type: string | null) => {
    switch (type) {
      case 'bill_update':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'event':
        return <Calendar className="h-5 w-5 text-green-500" />;
      default:
        return <Bell className="h-5 w-5 text-orange-500" />;
    }
  };

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
  };

  const handleCategoryClick = (index: number, label: string) => {
    setActiveCategory(index);
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  if (!user) {
    return null;
  }

  const displayNotifications = filteredNotifications;

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        <div className="max-w-6xl mx-auto">
          {/* FlowingMenu Banner */}
          <div className="mb-8 rounded-2xl overflow-hidden shadow-ios-soft" style={{ height: '120px' }}>
            <FlowingMenu
              items={[
                { link: '#', text: 'Stay Informed', image: 'https://picsum.photos/600/400?random=101' },
                { link: '#', text: 'Track Bills', image: 'https://picsum.photos/600/400?random=102' },
                { link: '#', text: 'Civic Events', image: 'https://picsum.photos/600/400?random=103' },
                { link: '#', text: 'Community', image: 'https://picsum.photos/600/400?random=104' }
              ]}
              speed={18}
              textColor="#1C1C1E"
              bgColor="rgba(255,255,255,0.98)"
              marqueeBgColor="#006600"
              marqueeTextColor="#FFFFFF"
              borderColor="rgba(0,0,0,0.04)"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-8">
            {/* LineSidebar - Left */}
            <div className="md:w-56 flex-shrink-0">
              <div className="sticky top-24">
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  <span>Filter</span>
                </div>
                <LineSidebar
                  items={NOTIFICATION_CATEGORIES}
                  accentColor="#006600"
                  textColor="#1C1C1E"
                  markerColor="#8E8E93"
                  showIndex={false}
                  showMarker={true}
                  proximityRadius={80}
                  maxShift={20}
                  falloff="smooth"
                  markerLength={40}
                  markerGap={8}
                  tickScale={0.4}
                  scaleTick={true}
                  itemGap={12}
                  fontSize={0.95}
                  smoothing={80}
                  defaultActive={0}
                  onItemClick={handleCategoryClick}
                  className="notifications-sidebar"
                />
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-2">
                    <Bell className="h-8 w-8 text-kenya-green" />
                    Notifications
                  </h1>
                  {unreadCount > 0 && (
                    <p className="text-muted-foreground">
                      You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="flex gap-3 self-end md:self-auto flex-wrap">
                    <SpecularButton
                      size="sm"
                      radius={12}
                      tint="#ffffff"
                      tintOpacity={0.06}
                      blur={0}
                      textColor="#1C1C1E"
                      lineColor="#006600"
                      baseColor="#C7C7CC"
                      intensity={1.0}
                      shineSize={10}
                      shineFade={40}
                      thickness={1}
                      speed={0.35}
                      followMouse={true}
                      proximity={250}
                      autoAnimate={false}
                      onClick={handleRefresh}
                    >
                      Refresh
                    </SpecularButton>
                    <SpecularButton
                      size="sm"
                      radius={12}
                      tint="#006600"
                      tintOpacity={0.12}
                      blur={0}
                      textColor="#006600"
                      lineColor="#FFFFFF"
                      baseColor="#006600"
                      intensity={1.4}
                      shineSize={12}
                      shineFade={35}
                      thickness={1.2}
                      speed={0.4}
                      followMouse={true}
                      proximity={250}
                      autoAnimate={false}
                      onClick={handleMarkAllRead}
                    >
                      <CheckCheck className="mr-1 h-4 w-4" />
                      Mark all as read
                    </SpecularButton>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="space-y-4">
                  <NotificationSkeleton />
                  <NotificationSkeleton />
                  <NotificationSkeleton />
                </div>
              ) : displayNotifications.length === 0 ? (
                <Card className="border border-border/50 shadow-ios-soft">
                  <CardContent className="p-8 text-center">
                    <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-medium mb-2">No notifications yet</h3>
                    <p className="text-muted-foreground mb-6">
                      When there are updates to bills you follow or important events, they'll appear here.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                      <SpecularButton
                        size="md"
                        radius={14}
                        tint="#ffffff"
                        tintOpacity={0.05}
                        blur={0}
                        textColor="#1C1C1E"
                        lineColor="#006600"
                        baseColor="#C7C7CC"
                        intensity={1.0}
                        shineSize={10}
                        shineFade={40}
                        thickness={1}
                        speed={0.35}
                        followMouse={true}
                        proximity={250}
                        autoAnimate={false}
                        onClick={() => navigate('/legislative-tracker')}
                      >
                        Browse Bills
                      </SpecularButton>
                      <SpecularButton
                        size="md"
                        radius={14}
                        tint="#006600"
                        tintOpacity={0.10}
                        blur={0}
                        textColor="#006600"
                        lineColor="#FFFFFF"
                        baseColor="#006600"
                        intensity={1.4}
                        shineSize={12}
                        shineFade={35}
                        thickness={1.2}
                        speed={0.4}
                        followMouse={true}
                        proximity={250}
                        autoAnimate={false}
                        onClick={() => navigate('/civic-calendar')}
                      >
                        Check Events
                      </SpecularButton>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {displayNotifications.map((notification) => (
                    <Card
                      key={notification.id}
                      className={`transition-all duration-200 shadow-ios-soft ${!notification.is_read ? 'border-kenya-green bg-muted/20' : 'border-border/50'}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex">
                          <div className="mr-4 mt-1">
                            {getNotificationIcon((notification as any).type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium">{notification.message}</p>
                                {!notification.is_read && (
                                  <Badge variant="default" className="bg-kenya-green">New</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-xs text-muted-foreground flex items-center">
                                  <Clock className="mr-1 h-3.5 w-3.5" />
                                  {formatDate(notification.created_at)}
                                </span>
                                {!notification.is_read && (
                                  <SpecularButton
                                    size="sm"
                                    radius={10}
                                    tint="#ffffff"
                                    tintOpacity={0.04}
                                    blur={0}
                                    textColor="#1C1C1E"
                                    lineColor="#006600"
                                    baseColor="#C7C7CC"
                                    intensity={0.8}
                                    shineSize={8}
                                    shineFade={30}
                                    thickness={0.8}
                                    speed={0.3}
                                    followMouse={true}
                                    proximity={200}
                                    autoAnimate={false}
                                    onClick={() => handleMarkAsRead(notification.id)}
                                  >
                                    <Check className="h-4 w-4" />
                                  </SpecularButton>
                                )}
                              </div>
                            </div>
                            {notification.link && (
                              <div className="mt-2">
                                <SpecularButton
                                  size="sm"
                                  radius={10}
                                  tint="#ffffff"
                                  tintOpacity={0.03}
                                  blur={0}
                                  textColor="#006600"
                                  lineColor="#006600"
                                  baseColor="#D1D1D6"
                                  intensity={0.9}
                                  shineSize={8}
                                  shineFade={30}
                                  thickness={0.8}
                                  speed={0.3}
                                  followMouse={true}
                                  proximity={200}
                                  autoAnimate={false}
                                  onClick={() => navigate(notification.link)}
                                >
                                  View details
                                </SpecularButton>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

const NotificationSkeleton = () => (
  <Card className="border-border/50 shadow-ios-soft">
    <CardContent className="p-4">
      <div className="flex">
        <Skeleton className="h-8 w-8 rounded-full mr-4" />
        <div className="flex-1">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-4 w-1/4 mt-2" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default Notifications;