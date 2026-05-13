/**
 * CEKA Sovereign Mailing Mesh
 * Shared utility for high-fidelity multi-provider email delivery with auto-failover.
 */

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

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
  email: "verify@civiceducationkenya.com"
};

/**
 * Exponential backoff helper to handle transient network issues
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < retries - 1) {
        const delay = Math.pow(2, i) * 1000;
        console.log(`[MailingMesh] Attempt ${i + 1} failed. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Sends an email using Resend
 */
async function sendWithResend(options: EmailOptions) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");

  // Basic email validation to avoid 400s
  const recipients = Array.isArray(options.to) ? options.to : [options.to];
  if (recipients.length === 0) throw new Error("No recipients specified");

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${options.from?.name || DEFAULT_FROM.name} <${options.from?.email || DEFAULT_FROM.email}>`,
      to: recipients,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>?/gm, ''), // Basic text fallback
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorData;
    try { errorData = JSON.parse(errorBody); } catch { errorData = errorBody; }
    throw new Error(`Resend API Error (${response.status}): ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

/**
 * Sends an email using Brevo (Sendinblue)
 */
async function sendWithBrevo(options: EmailOptions) {
  if (!BREVO_API_KEY) throw new Error("BREVO_API_KEY missing");

  const recipients = Array.isArray(options.to) ? options.to : [options.to];
  if (recipients.length === 0) throw new Error("No recipients specified");

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
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

  if (!response.ok) {
    const errorBody = await response.text();
    let errorData;
    try { errorData = JSON.parse(errorBody); } catch { errorData = errorBody; }
    throw new Error(`Brevo API Error (${response.status}): ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

/**
 * Main dispatch function with fallback logic and edge-case handling
 */
export async function sendEmail(options: EmailOptions) {
  const provider = options.provider || 'auto';

  // 1. Explicit Provider Requests
  if (provider === 'resend') {
    return withRetry(() => sendWithResend(options));
  }
  
  if (provider === 'brevo') {
    return withRetry(() => sendWithBrevo(options));
  }

  // 2. Auto/Mesh Logic (Intelligent Failover)
  // We prioritize Resend for speed, but if keys are missing or provider fails, we pivot.
  
  const canUseResend = !!RESEND_API_KEY;
  const canUseBrevo = !!BREVO_API_KEY;

  if (!canUseResend && !canUseBrevo) {
    throw new Error("Mailing Mesh Failure: No mail provider keys configured in Deno environment.");
  }

  // Chain: Resend -> Brevo
  if (canUseResend) {
    try {
      console.log("[MailingMesh] Strategy: Primary (Resend)");
      return await withRetry(() => sendWithResend(options));
    } catch (resendError: any) {
      console.error("[MailingMesh] Primary provider failed. Error:", resendError.message);
      if (!canUseBrevo) throw resendError;
      
      console.log("[MailingMesh] Strategy: Fallback pivoting to Brevo...");
      try {
        return await withRetry(() => sendWithBrevo(options));
      } catch (brevoError: any) {
        throw new Error(`Mailing Mesh Exhausted. Resend: ${resendError.message} | Brevo: ${brevoError.message}`);
      }
    }
  }

  // If only Brevo is available
  console.log("[MailingMesh] Strategy: Secondary Only (Brevo)");
  return withRetry(() => sendWithBrevo(options));
}
