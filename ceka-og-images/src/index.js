export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Only handle /og/* routes
    if (!url.pathname.startsWith("/og/")) {
      return new Response("Not Found", { status: 404 });
    }

    // Extract the bill slug: /og/bill/the-traffic-amendment-bill-2026.png
    const match = url.pathname.match(/^\/og\/bill\/(.+)\.png$/);
    if (!match) {
      return new Response("Not Found", { status: 404 });
    }

    const slug = match[1];

    // 1. Fetch bill data from Supabase
    const bill = await fetchBill(slug, env);
    if (!bill) {
      return new Response("Bill not found", { status: 404 });
    }

    // 2. Build the OG card HTML
    const html = buildOGCardHTML(bill);

    // 3. Screenshot the HTML using Browser Run
    const screenshot = await env.BROWSER.quickAction("screenshot", {
      html: html,
      screenshotOptions: {
        fullPage: false,
        type: "png",
      },
      viewport: {
        width: 1200,
        height: 630,
      },
      gotoOptions: {
        waitUntil: "domcontentloaded",
        timeout: 10000,
      },
    });

    // 4. Decode base64 and return the PNG
    // The response is JSON: { success: true, result: { screenshot: "base64...", content: "html..." } }
    const base64Image = screenshot.result.screenshot;
    const imageBuffer = Uint8Array.from(atob(base64Image), c => c.charCodeAt(0));

    return new Response(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    });
  },
};

// ─── Supabase fetch ───
async function fetchBill(slug, env) {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/bills?slug=eq.${encodeURIComponent(slug)}&select=title,status,slug`,
    {
      headers: {
        "apikey": env.SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${env.SUPABASE_ANON_KEY}`,
      },
    }
  );
  const data = await res.json();
  return data[0] || null;
}

// ─── OG Card HTML Template ───
function buildOGCardHTML(bill) {
  const title = bill.title || "Unknown Bill";
  const status = bill.status || "In Progress";

  // Status badge color
  const statusColor =
    status.toLowerCase().includes("pass") ? "#00A65A" :
    status.toLowerCase().includes("reject") ? "#DC2626" :
    "#F59E0B";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1200px;
      height: 630px;
      background: linear-gradient(135deg, #0a2818 0%, #0F172A 50%, #1a1a2e 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 60px;
      overflow: hidden;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .logo {
      width: 56px;
      height: 56px;
      background: #00A65A;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: 900;
      color: white;
    }
    .brand {
      font-size: 24px;
      font-weight: 800;
      color: #00A65A;
      letter-spacing: -0.02em;
    }
    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 24px;
    }
    .badge {
      display: inline-block;
      padding: 10px 24px;
      background: ${statusColor}20;
      border: 2px solid ${statusColor};
      border-radius: 100px;
      color: ${statusColor};
      font-size: 18px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      width: fit-content;
    }
    .title {
      font-size: 52px;
      font-weight: 900;
      color: white;
      line-height: 1.15;
      letter-spacing: -0.03em;
      max-width: 1000px;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .cta {
      font-size: 20px;
      font-weight: 700;
      color: #94A3B8;
    }
    .domain {
      font-size: 22px;
      font-weight: 800;
      color: #00A65A;
    }
    .accent-bar {
      position: absolute;
      top: 0;
      left: 0;
      width: 8px;
      height: 100%;
      background: linear-gradient(180deg, #00A65A 0%, #00783A 100%);
    }
  </style>
</head>
<body>
  <div class="accent-bar"></div>
  <div class="header">
    <div class="logo">C</div>
    <div class="brand">CEKA</div>
  </div>
  <div class="content">
    <div class="badge">${status}</div>
    <div class="title">${escapeHtml(title)}</div>
  </div>
  <div class="footer">
    <div class="cta">Read • Vote • Submit Petition</div>
    <div class="domain">civiceducationkenya.com</div>
  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
