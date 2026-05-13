/**
 * CEKA Sovereign Mailing Mesh
 * Shared utility for high-fidelity multi-provider email delivery
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
  name: "CEKA Sovereighty",
  email: "onboarding@resend.dev" // Default Resend test domain, update in prod
};

/**
 * Sends an email using Resend
 */
async function sendWithResend(options: EmailOptions) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${options.from?.name || DEFAULT_FROM.name} <${options.from?.email || DEFAULT_FROM.email}>`,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Resend Error: ${JSON.stringify(error)}`);
  }

  return response.json();
}

/**
 * Sends an email using Brevo (Sendinblue)
 */
async function sendWithBrevo(options: EmailOptions) {
  if (!BREVO_API_KEY) throw new Error("BREVO_API_KEY missing");

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
        email: options.from?.email || "info@parliament.go.ke" // Typical Brevo verified sender candidate
      },
      to: (Array.isArray(options.to) ? options.to : [options.to]).map(email => ({ email })),
      subject: options.subject,
      htmlContent: options.html,
      textContent: options.text,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Brevo Error: ${JSON.stringify(error)}`);
  }

  return response.json();
}

/**
 * Main dispatch function with fallback logic
 */
export async function sendEmail(options: EmailOptions) {
  const provider = options.provider || 'auto';

  if (provider === 'resend') return sendWithResend(options);
  if (provider === 'brevo') return sendWithBrevo(options);

  // Auto/Mesh Logic: Try Resend first, fallback to Brevo
  try {
    console.log("[MailingMesh] Attempting Resend...");
    return await sendWithResend(options);
  } catch (resendError) {
    console.error("[MailingMesh] Resend failed, pivoting to Brevo:", resendError);
    try {
      return await sendWithBrevo(options);
    } catch (brevoError) {
      console.error("[MailingMesh] Both providers failed.");
      throw new Error(`Mailing Mesh Exhausted. Resend: ${resendError.message} | Brevo: ${brevoError.message}`);
    }
  }
}
