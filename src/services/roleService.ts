import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'core_team' | 'ally' | null;

export interface RolePermission {
  permission: string;
  allowed_roles: string[];
}

// Permission keys — each maps to a set of admin features
export const PERMISSION_KEYS = {
  // Core team accessible
  BLOG_MANAGEMENT: 'blog_management',
  EVENT_MANAGEMENT: 'event_management',
  CAMPAIGN_MANAGEMENT: 'campaign_management',
  VOLUNTEER_MANAGEMENT: 'volunteer_management',
  MEDIA_APPRAISAL: 'media_appraisal',
  POLL_MANAGEMENT: 'poll_management',
  EMAIL_BROADCAST: 'email_broadcast',
  BULK_UPLOAD: 'bulk_upload',

  // Admin only — locked from core_team
  SOVEREIGN_SETTINGS: 'sovereign_settings',
  SESSION_MANAGEMENT: 'session_management',
  AUDIT_LOGS: 'audit_logs',
  ROLE_MANAGEMENT: 'role_management',
  SYSTEM_METRICS: 'system_metrics',
  INTELLIGENCE_PIPELINE: 'intelligence_pipeline',
  ANALYTICS_DASHBOARD: 'analytics_dashboard',
  USER_MANAGEMENT: 'user_management',
} as const;

// Default permission map — used as fallback if DB role_permissions table doesn't exist
const DEFAULT_PERMISSION_MAP: Record<string, string[]> = {
  [PERMISSION_KEYS.BLOG_MANAGEMENT]: ['admin', 'core_team'],
  [PERMISSION_KEYS.EVENT_MANAGEMENT]: ['admin', 'core_team'],
  [PERMISSION_KEYS.CAMPAIGN_MANAGEMENT]: ['admin', 'core_team'],
  [PERMISSION_KEYS.VOLUNTEER_MANAGEMENT]: ['admin', 'core_team'],
  [PERMISSION_KEYS.MEDIA_APPRAISAL]: ['admin', 'core_team'],
  [PERMISSION_KEYS.POLL_MANAGEMENT]: ['admin', 'core_team'],
  [PERMISSION_KEYS.EMAIL_BROADCAST]: ['admin', 'core_team'],
  [PERMISSION_KEYS.BULK_UPLOAD]: ['admin', 'core_team'],
  [PERMISSION_KEYS.SOVEREIGN_SETTINGS]: ['admin'],
  [PERMISSION_KEYS.SESSION_MANAGEMENT]: ['admin'],
  [PERMISSION_KEYS.AUDIT_LOGS]: ['admin'],
  [PERMISSION_KEYS.ROLE_MANAGEMENT]: ['admin'],
  [PERMISSION_KEYS.SYSTEM_METRICS]: ['admin'],
  [PERMISSION_KEYS.INTELLIGENCE_PIPELINE]: ['admin'],
  [PERMISSION_KEYS.ANALYTICS_DASHBOARD]: ['admin'],
  [PERMISSION_KEYS.USER_MANAGEMENT]: ['admin'],
};

const ROOT_ADMIN_EMAIL = "civiceducationkenya@gmail.com";

class RoleService {
  private cachedRole: UserRole | undefined = undefined;
  private cachedPermissions: Record<string, string[]> | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async getUserRole(userId?: string | null, userEmail?: string | null): Promise<UserRole> {
    // Return cached if valid
    if (this.cachedRole !== undefined && Date.now() - this.cacheTimestamp < this.CACHE_TTL) {
      return this.cachedRole;
    }

    try {
      let uid = userId;
      let email = userEmail;

      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          this.cachedRole = null;
          return null;
        }
        uid = user.id;
        email = user.email;
      }

      // Root admin bypass
      if (email === ROOT_ADMIN_EMAIL) {
        this.cachedRole = 'admin';
        this.cacheTimestamp = Date.now();
        return 'admin';
      }

      // Check user_roles table via RPC first
      const { data: hasAdminRole, error: rpcError } = await supabase.rpc('check_user_is_admin');
      if (!rpcError && hasAdminRole) {
        this.cachedRole = 'admin';
        this.cacheTimestamp = Date.now();
        return 'admin';
      }

      // Direct check on user_roles table
      const { data: roleData } = await (supabase
        .from('user_roles') as any)
        .select('role')
        .eq('user_id', uid)
        .maybeSingle();

      if (roleData?.role === 'admin') {
        this.cachedRole = 'admin';
        this.cacheTimestamp = Date.now();
        return 'admin';
      }

      if (roleData?.role === 'core_team') {
        this.cachedRole = 'core_team';
        this.cacheTimestamp = Date.now();
        return 'core_team';
      }

      // Legacy fallback: profiles table is_admin column
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', uid)
        .maybeSingle();

      if (profile?.is_admin) {
        this.cachedRole = 'admin';
        this.cacheTimestamp = Date.now();
        return 'admin';
      }

      this.cachedRole = null;
      this.cacheTimestamp = Date.now();
      return null;
    } catch (error) {
      console.error('Role check error:', error);
      this.cachedRole = null;
      return null;
    }
  }

  async isAdmin(userId?: string | null, userEmail?: string | null): Promise<boolean> {
    const role = await this.getUserRole(userId, userEmail);
    return role === 'admin';
  }

  /**
   * Check if user is core_team (restricted access)
   */
  async isCoreTeam(userId?: string | null, userEmail?: string | null): Promise<boolean> {
    const role = await this.getUserRole(userId, userEmail);
    return role === 'core_team';
  }

  /**
   * Check if user has any elevated role (admin or core_team)
   */
  async hasElevatedAccess(userId?: string | null, userEmail?: string | null): Promise<boolean> {
    const role = await this.getUserRole(userId, userEmail);
    return role === 'admin' || role === 'core_team';
  }

  /**
   * Load permission map from DB, fallback to defaults
   */
  private async loadPermissions(): Promise<Record<string, string[]>> {
    if (this.cachedPermissions && Date.now() - this.cacheTimestamp < this.CACHE_TTL) {
      return this.cachedPermissions;
    }

    try {
      const { data, error } = await (supabase
        .from('role_permissions' as any) as any)
        .select('permission, allowed_roles');

      if (error || !data || data.length === 0) {
        this.cachedPermissions = DEFAULT_PERMISSION_MAP;
        return DEFAULT_PERMISSION_MAP;
      }

      const permMap: Record<string, string[]> = {};
      (data as any[]).forEach((row: any) => {
        permMap[row.permission] = row.allowed_roles || [];
      });

      this.cachedPermissions = { ...DEFAULT_PERMISSION_MAP, ...permMap };
      return this.cachedPermissions;
    } catch {
      this.cachedPermissions = DEFAULT_PERMISSION_MAP;
      return DEFAULT_PERMISSION_MAP;
    }
  }

  /**
   * Check if current user has a specific permission
   */
  async hasPermission(permission: string, userId?: string | null, userEmail?: string | null): Promise<boolean> {
    const role = await this.getUserRole(userId, userEmail);
    if (!role) return false;

    // Admin always has all permissions
    if (role === 'admin') return true;

    const permissions = await this.loadPermissions();
    const allowedRoles = permissions[permission] || [];
    return allowedRoles.includes(role);
  }

  /**
   * Get all permissions the current user has
   */
  async getAccessiblePermissions(userId?: string | null, userEmail?: string | null): Promise<string[]> {
    const role = await this.getUserRole(userId, userEmail);
    if (!role) return [];

    if (role === 'admin') {
      return Object.values(PERMISSION_KEYS);
    }

    const permissions = await this.loadPermissions();
    return Object.entries(permissions)
      .filter(([, roles]) => roles.includes(role))
      .map(([perm]) => perm);
  }

  /**
   * Clear role cache (call on auth state change)
   */
  clearCache(): void {
    this.cachedRole = undefined;
    this.cachedPermissions = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Admin-only: Assign a role to a user
   */
  async assignRole(userId: string, role: 'admin' | 'core_team', currentUserId?: string | null, currentUserEmail?: string | null): Promise<void> {
    const currentRole = await this.getUserRole(currentUserId, currentUserEmail);
    if (currentRole !== 'admin') {
      throw new Error('Only admin can assign roles');
    }

    const { error } = await (supabase
      .from('user_roles') as any)
      .upsert({
        user_id: userId,
        role: role,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) throw error;
  }

  /**
   * Admin-only: Revoke a user's elevated role
   */
  async revokeRole(userId: string, currentUserId?: string | null, currentUserEmail?: string | null): Promise<void> {
    const currentRole = await this.getUserRole(currentUserId, currentUserEmail);
    if (currentRole !== 'admin') {
      throw new Error('Only admin can revoke roles');
    }

    const { error } = await (supabase
      .from('user_roles') as any)
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  }

  /**
   * Admin-only: List all users with elevated roles
   */
  async listRoleAssignments(userId?: string | null, userEmail?: string | null): Promise<any[]> {
    const currentRole = await this.getUserRole(userId, userEmail);
    if (currentRole !== 'admin') return [];

    const { data, error } = await (supabase
      .from('user_roles') as any)
      .select('*, profiles:user_id (full_name, email, avatar_url)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error listing role assignments:', error);
      return [];
    }

    return data || [];
  }
}

export const roleService = new RoleService();
