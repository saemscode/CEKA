var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
var src_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/og/")) {
      return new Response("Not Found", { status: 404 });
    }
    const match = url.pathname.match(/^\/og\/bill\/(.+)\.png$/);
    if (!match) {
      return new Response("Not Found", { status: 404 });
    }
    const slug = match[1];
    const bill = await fetchBill(slug, env);
    if (!bill) {
      return new Response("Bill not found", { status: 404 });
    }
    const html = buildOGCardHTML(bill);
    const screenshot = await env.BROWSER.quickAction("screenshot", {
      html,
      screenshotOptions: {
        fullPage: false,
        type: "png"
      },
      viewport: {
        width: 1200,
        height: 630
      },
      gotoOptions: {
        waitUntil: "domcontentloaded",
        timeout: 1e4
      }
    });
    return new Response(screenshot.body, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=604800"
      }
    });
  }
};
async function fetchBill(slug, env) {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/bills?slug=eq.${encodeURIComponent(slug)}&select=title,status,slug`,
    {
      headers: {
        "apikey": env.SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${env.SUPABASE_ANON_KEY}`
      }
    }
  );
  const data = await res.json();
  return data[0] || null;
}
__name(fetchBill, "fetchBill");
function buildOGCardHTML(bill) {
  const title = bill.title || "Unknown Bill";
  const status = bill.status || "In Progress";
  const statusColor = status.toLowerCase().includes("pass") ? "#00A65A" : status.toLowerCase().includes("reject") ? "#DC2626" : "#F59E0B";
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
    <div class="cta">Read \u2022 Vote \u2022 Submit Petition</div>
    <div class="domain">civiceducationkenya.com</div>
  </div>
</body>
</html>`;
}
__name(buildOGCardHTML, "buildOGCardHTML");
function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
__name(escapeHtml, "escapeHtml");

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// .wrangler/tmp/bundle-GagX5d/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-GagX5d/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
