// @ts-nocheck
/**
 * CEKA Sovereign Mailing Mesh [STRICT MODE - FULL IMPLEMENTATION]
 * 
 * Shared utility for high-fidelity multi-provider email delivery with auto-failover,
 * dynamic multi-key fleet rotation, and emergency bypass protocols.
 */

/**
 * Dynamically discovers all available API keys for a given provider prefix.
 * Supports infinite indexing (e.g., BREVO_API_KEY, BREVO_API_KEY_2, BREVO_API_KEY_3, etc.)
 */
const getKeys = (prefix: string): string[] => {
  const env = Deno.env.toObject();
  const keysMap: Record<number, string> = {};

  // 1. Check primary variants (standard and VITE)
  const primary = env[prefix] || env[`VITE_${prefix}`];
  if (primary) keysMap[1] = primary;

  // 2. Scan all environment variables for indexed keys (e.g., PREFIX_2)
  Object.keys(env).forEach(key => {
    // Matches patterns like BREVO_API_KEY_2 or VITE_BREVO_API_KEY_2
    const regex = new RegExp(`^(VITE_)?${prefix}_(\\d+)$`);
    const match = key.match(regex);
    if (match) {
      const index = parseInt(match[2], 10);
      keysMap[index] = env[key];
    }
  });

  // 3. Return keys sorted by their index to ensure predictable rotation
  return Object.keys(keysMap)
    .map(Number)
    .sort((a, b) => a - b)
    .map(index => keysMap[index]);
};

// Discover Fleets
const RESEND_KEYS = getKeys("RESEND_API_KEY");
const BREVO_KEYS = getKeys("BREVO_API_KEY");

// Emergency Protocol Flags
const BYPASS_MODE = Deno.env.get("MAILING_MESH_BYPASS") === "true";

export type EmailProvider = 'resend' | 'brevo' | 'auto';

interface EmailOptions {
  from?: { name: string; email: string };
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  provider?: EmailProvider;
}

const DEFAULT_FROM = {
  name: "Civic Education Kenya",
  email: "admin@civiceducationkenya.com"
};

/**
 * Exponential backoff helper to handle transient network issues
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;

      // If it's a quota error (429/403 with specific text), DO NOT retry the same key.
      // Throw immediately to trigger the fleet rotation logic.
      const isQuotaError =
        err.message?.includes('429') ||
        err.message?.includes('quota') ||
        err.message?.includes('limit') ||
        err.message?.includes('403');

      if (isQuotaError) {
        throw err;
      }

      if (i < retries - 1) {
        const delay = Math.pow(2, i) * 1000;
        console.warn(`[MailingMesh] Attempt ${i + 1} failed. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Sends an email using Resend with dynamic multi-key rotation
 */
async function sendWithResend(options: EmailOptions) {
  if (RESEND_KEYS.length === 0) throw new Error("RESEND_API_KEY fleet is empty");

  const recipients = Array.isArray(options.to) ? options.to : [options.to];

  let lastError: any;
  for (const key of RESEND_KEYS) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${options.from?.name || DEFAULT_FROM.name} <${options.from?.email || DEFAULT_FROM.email}>`,
          to: recipients,
          subject: options.subject,
          html: options.html,
          text: options.text || options.html.replace(/<[^>]*>?/gm, ''),
        }),
      });

      const resultText = await response.text();
      if (!response.ok) {
        console.error(`[MailingMesh] Resend Key ${key.substring(0, 8)}... FAILED (${response.status}): ${resultText}`);
        
        // If quota hit or forbidden, log warning and try NEXT key in fleet
        if (response.status === 429 || response.status === 403 || resultText.toLowerCase().includes("limit")) {
          console.warn(`[MailingMesh] Resend Key ${key.substring(0, 8)}... rotating due to status/text.`);
          continue;
        }
        throw new Error(`Resend API Error (${response.status}): ${resultText}`);
      }

      console.log(`[MailingMesh] Resend success with key ${key.substring(0, 8)}...`);
      return JSON.parse(resultText);
    } catch (err: any) {
      lastError = err;
      console.error(`[MailingMesh] Resend fleet member critical error:`, err.message);
    }
  }
  throw lastError || new Error("All Resend keys in fleet exhausted");
}

/**
 * Sends an email using Brevo (Sendinblue) with dynamic multi-key rotation
 */
async function sendWithBrevo(options: EmailOptions) {
  if (BREVO_KEYS.length === 0) throw new Error("BREVO_API_KEY fleet is empty");

  const recipients = Array.isArray(options.to) ? options.to : [options.to];
  
  let lastError: any;
  for (const key of BREVO_KEYS) {
    try {
      console.log(`[MailingMesh] Attempting Brevo with key ${key.substring(0, 8)}...`);
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': key,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: options.from?.name || DEFAULT_FROM.name,
            email: options.from?.email || DEFAULT_FROM.email
          },
          to: recipients.map(email => ({ email })),
          subject: options.subject,
          htmlContent: options.html,
          textContent: options.text || options.html.replace(/<[^>]*>?/gm, ''),
        }),
      });

      const resultText = await response.text();
      if (!response.ok) {
        console.error(`[MailingMesh] Brevo Key ${key.substring(0, 8)}... FAILED (${response.status}): ${resultText}`);
        
        // If unverified (401/403) or quota hit (429), ROTATE to the next key in the fleet
        if (response.status === 401 || response.status === 403 || response.status === 429 || resultText.toLowerCase().includes("quota") || resultText.toLowerCase().includes("limit")) {
          if (response.status === 403 || response.status === 401) {
            console.warn(`[MailingMesh] Brevo Key ${key.substring(0, 8)}... is UNVERIFIED or FORBIDDEN. Skipping to next fleet member...`);
          } else {
            console.warn(`[MailingMesh] Brevo Key ${key.substring(0, 8)}... hit quota/limit. Rotating...`);
          }
          continue;
        }
        throw new Error(`Brevo API Error (${response.status}): ${resultText}`);
      }

      console.log(`[MailingMesh] Brevo success with current fleet member. Sent to: ${recipients.join(', ')}`);
      return JSON.parse(resultText);
    } catch (err: any) {
      lastError = err;
      console.error(`[MailingMesh] Brevo fleet member encounter:`, err.message);
    }
  }
  throw lastError || new Error("All Brevo keys in fleet exhausted");
}

/**
 * Main dispatch function with fallback logic, fleet rotation, and bypass protocols.
 */
export async function sendEmail(options: EmailOptions) {
  // 1. Emergency Bypass Protocol
  if (BYPASS_MODE) {
    console.warn("[MailingMesh] [EMERGENCY] Bypass Protocol Active. Faking delivery success.");
    return { success: true, bypassed: true, timestamp: new Date().toISOString() };
  }

  const recipients = Array.isArray(options.to) ? options.to : [options.to];
  console.log(`[MailingMesh] Dispatching email to: ${recipients.join(', ')} | Subject: ${options.subject}`);

  const provider = options.provider || 'auto';

  // 2. Explicit Provider Dispatch
  if (provider === 'resend') {
    return withRetry(() => sendWithResend(options));
  }

  if (provider === 'brevo') {
    return withRetry(() => sendWithBrevo(options));
  }

  // 3. Auto/Mesh Logic (Intelligent Multi-Fleet Failover)
  const canUseResend = RESEND_KEYS.length > 0;
  const canUseBrevo = BREVO_KEYS.length > 0;

  if (!canUseResend && !canUseBrevo) {
    throw new Error("Mailing Mesh TOTAL BLACKOUT: No keys found in either Resend or Brevo fleets.");
  }

  // UPDATED PRIORITY (Step 259): Brevo Fleet (Primary/Paid) -> Resend Fleet (Fallback/Limited)
  if (canUseBrevo) {
    try {
      console.log(`[MailingMesh] Strategy: Fleet Primary (Brevo, keys: ${BREVO_KEYS.length})`);
      return await withRetry(() => sendWithBrevo(options));
    } catch (brevoError: any) {
      console.error("[MailingMesh] Brevo fleet TOTAL exhaustion. Pivoting to fallback fleet...");

      if (!canUseResend) throw brevoError;

      try {
        console.log(`[MailingMesh] Strategy: Fleet Fallback (Resend, keys: ${RESEND_KEYS.length})`);
        return await withRetry(() => sendWithResend(options));
      } catch (resendError: any) {
        throw new Error(`Mailing Mesh TOTAL Blackout. Brevo Fleet: ${brevoError.message} | Resend Fleet: ${resendError.message}`);
      }
    }
  }

  // If only Resend is provisioned
  console.log(`[MailingMesh] Strategy: Standalone Fleet (Resend, keys: ${RESEND_KEYS.length})`);
  return withRetry(() => sendWithResend(options));
}
