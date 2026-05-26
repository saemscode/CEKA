/* ═══════════════════════════════════════════════════════════════════════════
   CEKA MAINTENANCE ROUTING WIRING
   File: MAINTENANCE_ROUTER_WIRING.tsx  (reference block — not a standalone file)

   Three changes to make in your existing App.tsx / router config:

   ① Import the two new components
   ② Add the /maintenance route
   ③ Redirect /resources, /legislative-tracker, /bill/* → /maintenance
   ④ Mount <MaintenanceBanner /> inside your Layout component

   EXACT DROP-IN BLOCKS BELOW:
═══════════════════════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────────────────────────────────
// ① ADD THESE IMPORTS to the top of App.tsx (alongside your existing imports)
// ─────────────────────────────────────────────────────────────────────────────
import MaintenancePage   from "@/pages/MaintenancePage";   // adjust path to where you placed the file
import MaintenanceBanner from "@/components/MaintenanceBanner"; // adjust path to where you placed the file
// also ensure Navigate is imported from react-router-dom:
import { Navigate } from "react-router-dom";


// ─────────────────────────────────────────────────────────────────────────────
// ② ROUTE BLOCK — add inside your <Routes> (or equivalent router config)
//    Place BEFORE your existing catch-all / wildcard route.
//    These three redirects replace the three erroring routes entirely.
// ─────────────────────────────────────────────────────────────────────────────

// The dedicated maintenance page — no Layout wrapper, full takeover
<Route path="/maintenance" element={<MaintenancePage />} />

// Hard redirects for the three broken surfaces
<Route path="/resources"            element={<Navigate to="/maintenance" replace />} />
<Route path="/legislative-tracker"  element={<Navigate to="/maintenance" replace />} />
<Route path="/bill/:id"             element={<Navigate to="/maintenance" replace />} />
// If your bill route uses a slug or different param name, match it here:
// <Route path="/bill/:billId"        element={<Navigate to="/maintenance" replace />} />
// <Route path="/bill/*"              element={<Navigate to="/maintenance" replace />} />


// ─────────────────────────────────────────────────────────────────────────────
// ③ LAYOUT INTEGRATION — mount the banner inside your root Layout component.
//    Open your Layout.tsx (or whatever wraps all pages with the navbar).
//    Add <MaintenanceBanner /> as the FIRST child, ABOVE the <nav> / header.
//    The banner is self-dismissing and uses sessionStorage — no state needed here.
//
//    EXAMPLE Layout.tsx structure (add only the import + the one component line):
// ─────────────────────────────────────────────────────────────────────────────

import MaintenanceBanner from "@/components/MaintenanceBanner"; // ← add this import

const Layout: React.FC = ({ children }) => {
  return (
    <div>
      {/* ↓ ADD THIS LINE — banner mounts here, above the navbar */}
      <MaintenanceBanner />

      {/* YOUR EXISTING NAVBAR — leave as-is */}
      <YourExistingNavbar />

      {/* YOUR EXISTING PAGE CONTENT — leave as-is */}
      <main>{children}</main>
    </div>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// ④ SUPPORT URL — update in MaintenancePage.tsx line 14 once your live
//    donation link is confirmed:
//
//    const SUPPORT_URL = "https://ko-fi.com/civiceducationke";
//                         ↑ replace with Paystack link / M-Pesa short URL / etc.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// ⑤ FILE PLACEMENT (suggested, adjust to match your existing structure)
//
//    src/
//    ├── pages/
//    │   └── MaintenancePage.tsx     ← full redirect target page
//    └── components/
//        └── MaintenanceBanner.tsx   ← slim banner for all other pages
// ─────────────────────────────────────────────────────────────────────────────
