// Storage Service - Hybrid Storage with R2 Primary and Supabase Fallback
// Handles file uploads with automatic provider selection and metadata sync

import { supabase } from '@/integrations/supabase/client';
import backblazeStorage from './backblazeStorage';

export interface UploadOptions {
    folder?: string;
    upsert?: boolean;
    onProgress?: (progress: number) => void;
}

export interface UploadResult {
    success: boolean;
    url?: string;
    path?: string;
    error?: string;
    provider?: 'supabase' | 'backblaze';
}

class StorageService {
    private initialized = false;
    private useBackblaze = false;
    private urlCache: Map<string, { url: string, expiry: number }> = new Map();
    private promiseCache: Map<string, Promise<string>> = new Map();
    private CACHE_TTL = 1000 * 60 * 4; // 4 minutes

    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            // Respect VITE_STORAGE_PROVIDER if set to 'supabase' specifically
            const provider = import.meta.env.VITE_STORAGE_PROVIDER;

            if (provider === 'supabase') {
                console.log('[StorageService] Forced to Supabase Storage by environment config');
                this.useBackblaze = false;
            } else {
                // Backblaze disabled — R2 is now primary for legacy reads
                this.useBackblaze = false;
                console.log('[StorageService] Backblaze disabled; using Supabase Storage for writes');
            }
        } catch (error) {
            console.warn('[StorageService] Backblaze init skipped, using Supabase:', error);
            this.useBackblaze = false;
        }

        this.initialized = true;
    }

    async upload(file: File, path: string, options: UploadOptions = {}): Promise<UploadResult> {
        await this.initialize();

        const folder = options.folder || 'resources';
        const fullPath = path.startsWith(folder) ? path : `${folder}/${path}`;

        // Uploads now route exclusively to Supabase (or future R2 upload logic)
        console.log(`[Storage] Uploading to supabase: ${fullPath}`);

        return await this.uploadToSupabase(file, fullPath, options);
    }

    private async uploadToSupabase(file: File, path: string, options: UploadOptions): Promise<UploadResult> {
        try {
            // Extract bucket from path
            const parts = path.split('/');
            const bucket = parts[0];
            const filePath = parts.slice(1).join('/');

            options.onProgress?.(10);

            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: options.upsert ?? true
                });

            if (error) {
                console.error('[Storage] Supabase upload error:', error);
                throw error;
            }

            options.onProgress?.(80);

            const { data: urlData } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);

            options.onProgress?.(100);

            return {
                success: true,
                url: urlData.publicUrl,
                path: data.path,
                provider: 'supabase'
            };
        } catch (error: any) {
            console.error('[Storage] Upload failed:', error);
            return {
                success: false,
                error: error.message || 'Upload failed'
            };
        }
    }

    async uploadAvatar(file: File, userId: string): Promise<UploadResult> {
        const fileName = `${userId}-${Date.now()}.${file.name.split('.').pop()}`;

        try {
            const { data, error } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (error) throw error;

            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            // Update profile with new avatar URL
            await supabase
                .from('profiles')
                .update({ avatar_url: urlData.publicUrl })
                .eq('id', userId);

            return {
                success: true,
                url: urlData.publicUrl,
                path: data.path,
                provider: 'supabase'
            };
        } catch (error: any) {
            console.error('[Storage] Avatar upload error:', error);
            return {
                success: false,
                error: error.message || 'Avatar upload failed'
            };
        }
    }

    async uploadResource(file: File, onProgress?: (progress: number) => void): Promise<UploadResult> {
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${Date.now()}-${sanitizedName}`;
        const path = `resources/${fileName}`;

        return await this.upload(file, path, { folder: 'resources', onProgress });
    }

    generateMediaPath(fileName: string, type: string, slug: string): string {
        const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const extension = sanitizedName.split('.').pop() || '';
        const baseName = sanitizedName.replace(/\.[^/.]+$/, "");

        // carousels/green-under-siege/1.png
        if (type === 'carousel-item') {
            return `carousels/${slug}/${sanitizedName}`;
        }

        return `media/${slug}/${type}/${Date.now()}-${sanitizedName}`;
    }

    async delete(path: string): Promise<boolean> {
        try {
            const parts = path.split('/');
            const bucket = parts[0];
            const filePath = parts.slice(1).join('/');

            const { error } = await supabase.storage
                .from(bucket)
                .remove([filePath]);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('[Storage] Delete error:', error);
            return false;
        }
    }

    async getAuthorizedUrl(pathOrUrl: string): Promise<string> {
        if (!pathOrUrl) return '';

        // Check value cache first
        const now = Date.now();
        const cached = this.urlCache.get(pathOrUrl);
        if (cached && cached.expiry > now) {
            return cached.url;
        }

        // Check promise cache to prevent concurrent request storm
        const existingPromise = this.promiseCache.get(pathOrUrl);
        if (existingPromise) {
            return existingPromise;
        }

        // Create new authorization promise
        const authPromise = (async () => {
            try {
                await this.initialize();

                let authorizedUrl = pathOrUrl;

                // MIGRATED: Rewrite legacy Backblaze URLs to Cloudflare R2
                if (pathOrUrl.includes('backblazeb2.com') || pathOrUrl.includes('ceka-resources-vault')) {
                    try {
                        const url = new URL(pathOrUrl);
                        const pathParts = url.pathname.split('/');
                        // Backblaze format: /file/ceka-resources-vault/carousels/...
                        // R2 format: /carousels/...
                        const r2Path = pathParts.slice(3).join('/');
                        authorizedUrl = `https://cdn.civiceducationkenya.com/${r2Path}`;
                    } catch {
                        authorizedUrl = pathOrUrl; // Graceful fallback
                    }
                } else if (pathOrUrl.startsWith('http')) {
                    authorizedUrl = pathOrUrl;
                } else if (pathOrUrl.includes('b2-image/')) {
                    authorizedUrl = pathOrUrl;
                } else if (this.useBackblaze) {
                    // Legacy path — kept for safety but unreachable since useBackblaze = false
                    const signed = await backblazeStorage.getAuthorizedUrl(pathOrUrl);
                    authorizedUrl = signed || pathOrUrl;
                } else {
                    // Supabase fallback
                    const parts = pathOrUrl.split('/');
                    if (parts.length >= 2) {
                        const { data, error } = await supabase.storage
                            .from(parts[0])
                            .createSignedUrl(parts.slice(1).join('/'), 3600);
                        if (!error && data) authorizedUrl = data.signedUrl;
                    }
                }

                // Update value cache
                this.urlCache.set(pathOrUrl, { url: authorizedUrl, expiry: Date.now() + this.CACHE_TTL });
                return authorizedUrl;
            } finally {
                // Clear promise cache when done
                this.promiseCache.delete(pathOrUrl);
            }
        })();

        this.promiseCache.set(pathOrUrl, authPromise);
        return authPromise;
    }

    getStorageProvider(): string {
        return this.useBackblaze ? 'backblaze' : 'supabase';
    }

    isBackblazeEnabled(): boolean {
        return this.useBackblaze;
    }
}

export const storageService = new StorageService();
export default storageService;
