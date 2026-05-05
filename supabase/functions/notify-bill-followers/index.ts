import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── FCM HTTP v1 Auth ─────────────────────────────────────────────────────────
async function getFCMAccessToken(serviceAccount: Record<string, string>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      iss: serviceAccount.client_email,
      sub: serviceAccount.client_email,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
    })
  );

  // Build JWT string for signing
  const signingInput = `${header}.${payload}`;

  // Import the RSA private key
  const keyData = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\n/g, "");
  const keyBytes = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(signingInput)
  );
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  const jwt = `${signingInput}.${signatureB64}`;

  // Exchange JWT for OAuth2 access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }).toString(),
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error(`FCM token exchange failed: ${JSON.stringify(tokenData)}`);
  }
  return tokenData.access_token;
}

// ─── FCM Multicast Send ───────────────────────────────────────────────────────
interface FCMPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

async function sendFCMMulticast(
  tokens: string[],
  payload: FCMPayload,
  projectId: string,
  accessToken: string
): Promise<{ success: number; failure: number }> {
  const results = { success: 0, failure: 0 };

  // FCM HTTP v1 does not support multicast natively; batch into groups of 500
  const BATCH_SIZE = 500;
  const batches: string[][] = [];
  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    batches.push(tokens.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    // Use the FCM batch send endpoint (send individual messages in parallel)
    const sends = batch.map((token) =>
      fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token,
              notification: {
                title: payload.title,
                body: payload.body,
                ...(payload.imageUrl ? { image: payload.imageUrl } : {}),
              },
              data: payload.data || {},
              android: {
                priority: "high",
                notification: {
                  channel_id: "bill_updates",
                  click_action: "FLUTTER_NOTIFICATION_CLICK",
                  sound: "default",
                  icon: "ceka_icon",
                  color: "#00B400",
                },
              },
              apns: {
                payload: {
                  aps: {
                    alert: { title: payload.title, body: payload.body },
                    badge: 1,
                    sound: "default",
                  },
                },
                headers: { "apns-priority": "10" },
              },
              webpush: {
                notification: {
                  title: payload.title,
                  body: payload.body,
                  icon: "/icons/icon-192x192.png",
                  badge: "/icons/badge-72x72.png",
                  ...(payload.imageUrl ? { image: payload.imageUrl } : {}),
                  requireInteraction: true,
                  actions: [
                    { action: "view_bill", title: "View Bill" },
                    { action: "dismiss", title: "Dismiss" },
                  ],
                },
                fcm_options: {
                  link: payload.data?.bill_id
                    ? `https://ceka.co.ke/bills/${payload.data.bill_id}`
                    : "https://ceka.co.ke/legislative-tracker",
                },
              },
            },
          }),
        }
      )
        .then((r) => (r.ok ? results.success++ : results.failure++))
        .catch(() => results.failure++)
    );
    await Promise.all(sends);
  }

  return results;
}

// ─── Build notification payload based on event type ──────────────────────────
function buildPayload(
  type: "INSERT" | "UPDATE",
  record: Record<string, string>,
  oldRecord?: Record<string, string>
): FCMPayload | null {
  if (type === "INSERT") {
    return {
      title: "🏛️ New Bill Published",
      body: `${record.title} has been introduced in the ${record.house || "Parliament"}.`,
      data: {
        type: "new_bill",
        bill_id: record.id,
        bill_title: record.title,
        status: record.status || "",
        url: `https://ceka.co.ke/bills/${record.id}`,
      },
    };
  }

  if (type === "UPDATE") {
    // Status change
    if (oldRecord && record.status !== oldRecord.status) {
      const statusEmoji: Record<string, string> = {
        "First Reading": "📖",
        "Second Reading": "📋",
        "Committee Stage": "🔍",
        "Third Reading": "📝",
        "Presidential Assent": "✍️",
        Enacted: "⚖️",
        "Public Feedback": "💬",
      };
      const emoji = statusEmoji[record.status] || "📋";
      return {
        title: `${emoji} Bill Status Updated`,
        body: `${record.title} has moved to: ${record.status}`,
        data: {
          type: "status_change",
          bill_id: record.id,
          bill_title: record.title,
          new_status: record.status,
          old_status: oldRecord.status || "",
          url: `https://ceka.co.ke/bills/${record.id}`,
        },
      };
    }

    // Neural summary / AI analysis completed
    if (
      oldRecord &&
      !oldRecord.neural_summary &&
      record.neural_summary &&
      record.analysis_status === "completed"
    ) {
      return {
        title: "🧠 Bill Intelligence Ready",
        body: `CEKA has finished analyzing "${record.title}". Tap to read the full civic report.`,
        data: {
          type: "analysis_complete",
          bill_id: record.id,
          bill_title: record.title,
          url: `https://ceka.co.ke/bills/${record.id}`,
        },
      };
    }

    // Corroboration score update (significant jump)
    const oldScore = parseFloat(oldRecord?.corroboration_score || "0");
    const newScore = parseFloat(record.corroboration_score || "0");
    if (oldRecord && newScore - oldScore >= 20) {
      return {
        title: "📊 New Evidence Corroborated",
        body: `"${record.title}" data fidelity jumped to ${Math.round(newScore)}%. More sources verified.`,
        data: {
          type: "corroboration_update",
          bill_id: record.id,
          bill_title: record.title,
          score: String(Math.round(newScore)),
          url: `https://ceka.co.ke/bills/${record.id}`,
        },
      };
    }
  }

  return null;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
  try {
    const body = await req.json();
    const { record, old_record, type } = body as {
      record: Record<string, string>;
      old_record?: Record<string, string>;
      type: "INSERT" | "UPDATE" | "DELETE";
    };

    if (type === "DELETE") {
      return new Response(JSON.stringify({ message: "DELETE events ignored" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const notificationPayload = buildPayload(type, record, old_record);
    if (!notificationPayload) {
      return new Response(JSON.stringify({ message: "No notification needed for this change" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Init Supabase admin client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch followers with their FCM tokens from profiles
    const { data: followers, error: followerError } = await supabase
      .from("bill_follows")
      .select("user_id, profiles(fcm_token)")
      .eq("bill_id", record.id);

    if (followerError) {
      console.error("Error fetching followers:", followerError);
    }

    const tokens: string[] = [];
    if (followers && Array.isArray(followers)) {
      for (const f of followers) {
        const profile = f.profiles as { fcm_token?: string } | null;
        if (profile?.fcm_token) {
          tokens.push(profile.fcm_token);
        }
      }
    }

    if (tokens.length === 0) {
      return new Response(
        JSON.stringify({ message: "No followers with FCM tokens", bill_id: record.id }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get FCM credentials
    const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
    if (!serviceAccountJson) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON secret is not set");
    }
    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId: string = serviceAccount.project_id;

    const accessToken = await getFCMAccessToken(serviceAccount);
    const sendResults = await sendFCMMulticast(tokens, notificationPayload, projectId, accessToken);

    // Write notification record to user_notifications table for in-app bell
    // Do this for all followers regardless of FCM token availability
    const allFollowerIds: string[] = (followers || []).map(
      (f: { user_id: string }) => f.user_id
    );

    if (allFollowerIds.length > 0) {
      const notifications = allFollowerIds.map((userId) => ({
        user_id: userId,
        source_type: "bill_update",
        source_id: record.id,
        title: notificationPayload.title,
        message: notificationPayload.body,
        link: `https://ceka.co.ke/bills/${record.id}`,
        priority: type === "INSERT" ? "high" : "normal",
        metadata: notificationPayload.data || {},
      }));

      const { error: notifError } = await supabase
        .from("user_notifications")
        .insert(notifications);

      if (notifError) {
        console.error("Error creating in-app notifications:", notifError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        fcm_sent: sendResults.success,
        fcm_failed: sendResults.failure,
        in_app_notified: allFollowerIds.length,
        bill_id: record.id,
        notification_type: notificationPayload.data?.type,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("notify-bill-followers error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
