import { supabase } from '@/integrations/supabase/client';

export interface SocialTemplate {
  id: string;
  bill_id: string;
  platform: 'twitter' | 'whatsapp' | 'instagram' | 'general';
  template: string;
  created_at: string;
}

class SocialService {
  /**
   * Fetch pre-made share templates for a specific bill from Supabase.
   * Falls back to generated templates if none are seeded for this bill.
   */
  async getTemplates(billId: string, billTitle?: string, billStatus?: string): Promise<SocialTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('social_templates' as any)
        .select('*')
        .eq('bill_id', billId)
        .order('created_at', { ascending: true });

      if (!error && data && (data as any[]).length > 0) {
        return data as unknown as SocialTemplate[];
      }

      // Generate sensible fallback templates if none are seeded yet
      if (billTitle) {
        return this.generateFallbackTemplates(billId, billTitle, billStatus);
      }
      return [];
    } catch {
      if (billTitle) return this.generateFallbackTemplates(billId, billTitle, billStatus);
      return [];
    }
  }

  private generateFallbackTemplates(
    billId: string,
    billTitle: string,
    billStatus?: string
  ): SocialTemplate[] {
    const now = new Date().toISOString();
    const url = `https://ceka.co.ke/bills/${billId}`;
    const status = billStatus ? ` [${billStatus}]` : '';
    return [
      {
        id: `gen-tw-${billId}`,
        bill_id: billId,
        platform: 'twitter',
        template: `🏛️ "${billTitle}"${status} is making its way through Parliament.\n\nHere's what it means for Kenya 🇰🇪 👇\n${url}\n\n#Kenya #Parliament #CEKA #CivicEducation`,
        created_at: now,
      },
      {
        id: `gen-wa-${billId}`,
        bill_id: billId,
        platform: 'whatsapp',
        template: `📋 *${billTitle}*${status}\n\nDid you know this bill is currently in Parliament?\n\n🔍 Read the full KI report & citizen concerns here:\n${url}\n\nShared via CEKA — Kenya's Civic Intelligence Platform 🇰🇪`,
        created_at: now,
      },
      {
        id: `gen-ig-${billId}`,
        bill_id: billId,
        platform: 'instagram',
        template: `"${billTitle}" — a bill that affects YOU.\n\nSwipe up to read the full civic intelligence report 🔍\nLink in bio → ceka.co.ke/bills/${billId}\n.\n#Kenya #Parliament #TujumuikeSasa #CEKA #CivicEd #KenyaLaw`,
        created_at: now,
      },
      {
        id: `gen-gen-${billId}`,
        bill_id: billId,
        platform: 'general',
        template: `I just read the CEKA intelligence report on "${billTitle}".\n\nHere's what every Kenyan should know: ${url}`,
        created_at: now,
      },
    ];
  }

  /**
   * Merge a user's personal response text into a template before sharing.
   */
  mergeResponseIntoTemplate(template: string, responseText?: string): string {
    if (!responseText || !responseText.trim()) return template;
    // Append response as a personal stance below the template
    return `${template}\n\n💬 My take: "${responseText.trim()}"`;
  }

  /**
   * Open the platform's native share intent. Uses Web Share API if available,
   * then falls back to intent URLs. For Instagram copies to clipboard.
   */
  async share(
    text: string,
    platform: 'twitter' | 'whatsapp' | 'instagram' | 'general',
    url?: string
  ): Promise<void> {
    const shareText = text.trim();

    // Try Web Share API first (mobile / modern desktop)
    if (platform === 'general' && 'share' in navigator) {
      try {
        await navigator.share({ text: shareText, url });
        return;
      } catch {
        // User dismissed — fall through
      }
    }

    const encodedText = encodeURIComponent(shareText);
    const encodedUrl = url ? encodeURIComponent(url) : '';

    const intentUrls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}`,
      whatsapp: `https://wa.me/?text=${encodedText}`,
      instagram: '', // No direct web share; copy to clipboard instead
      general: url ? `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}` : `https://wa.me/?text=${encodedText}`,
    };

    if (platform === 'instagram') {
      // Copy to clipboard then inform user
      try {
        await navigator.clipboard.writeText(shareText);
      } catch {
        // Clipboard API not available on this browser
      }
      return;
    }

    const intentUrl = intentUrls[platform];
    if (intentUrl) {
      window.open(intentUrl, '_blank', 'noopener,noreferrer');
    }
  }
}

export const socialService = new SocialService();
export default socialService;
