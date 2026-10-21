/**
 * Batch migration script: Replace old dark-green theme tokens with new
 * warm cream/espresso palette across all customer app files.
 *
 * Old → New mappings:
 *   #0F3D2E (dark green primary)  → #7A3316  (rust-brown primary)
 *   #16503D (dark green hover)    → #5E2610  (rust-brown hover)
 *   #FFF1C9 (butter yellow fill)  → #F3E9DC  (inactive chip / soft bg)
 *   #C93A1C (old red accent CTA)  → #7A3316  (rust-brown primary)
 *   0F3D2E/60 backdrop            → 2B1810/60 backdrop
 *   0F3D2E/20 ring                → 7A3316/20 ring
 *   0F3D2E/30 ring                → 7A3316/30 ring
 *   bg-stone-900 (button/icon)    → bg-[#7A3316]
 *   bg-stone-800                  → bg-[#7A3316]
 *   bg-stone-100 (neutral bg)     → bg-[#F3E9DC]
 *   bg-stone-50  (neutral bg)     → bg-[#FBF6EF]
 *   text-stone-900                → text-[#2B1810]
 *   text-stone-800                → text-[#2B1810]
 *   border-stone-200              → border-[#EFE4D6]
 *   border-stone-300              → border-[#EFE4D6]
 *   bg-white (page/card)          → bg-[#FBF6EF] or bg-[#FFFDF9]  (contextual - NOT blanket replaced)
 *
 * RULES:
 *   - Do NOT touch MenuItemRow.jsx (food card design preserved)
 *   - Do NOT touch AdminPage, POS, KDS, backend, DB
 *   - Only touch apps/customer/
 */

const fs = require('fs');
const path = require('path');

// Files to migrate (explicit list for safety)
const TARGET_FILES = [
  'apps/customer/src/App.jsx',
  'apps/customer/src/context/TenantContext.jsx',
  // Pages
  'apps/customer/src/pages/customer/OrdersPage.jsx',
  'apps/customer/src/pages/customer/TrackOrderPage.jsx',
  'apps/customer/src/pages/customer/OrderConfirmPage.jsx',
  'apps/customer/src/pages/customer/BillPage.jsx',
  'apps/customer/src/pages/customer/ReceiptPage.jsx',
  'apps/customer/src/pages/customer/OffersPage.jsx',
  'apps/customer/src/pages/customer/GalleryPage.jsx',
  'apps/customer/src/pages/customer/NotFoundPage.jsx',
  'apps/customer/src/pages/customer/LegalPage.jsx',
  'apps/customer/src/pages/customer/UnsubscribePage.jsx',
  'apps/customer/src/pages/customer/AboutPage.jsx',
  'apps/customer/src/pages/customer/ContactPage.jsx',
  // Already-touched pages - still clean up remaining old tokens
  'apps/customer/src/pages/customer/CartPage.jsx',
  'apps/customer/src/pages/customer/CheckoutPage.jsx',
  // Components
  'apps/customer/src/components/menu/ProductModal.jsx',
  'apps/customer/src/components/menu/MenuCard.jsx',
  'apps/customer/src/components/menu/PopularCard.jsx',
  'apps/customer/src/components/menu/MenuSkeletons.jsx',
  'apps/customer/src/components/menu/VegMark.jsx',
  'apps/customer/src/components/menu/CustomerProductCard.jsx',
  'apps/customer/src/components/menu/DesktopOrderSidebar.jsx',
  'apps/customer/src/components/ui/CustomerNavDrawer.jsx',
  'apps/customer/src/components/ui/CustomerNotificationStatus.jsx',
  'apps/customer/src/components/ui/Footer.jsx',
  'apps/customer/src/components/ui/Navbar.jsx',
  'apps/customer/src/components/ui/NotificationPermissionPrompt.jsx',
  'apps/customer/src/components/ui/OtpLoginModal.jsx',
  'apps/customer/src/components/ui/QrScannerModal.jsx',
  'apps/customer/src/components/ui/QuickCartDrawer.jsx',
  'apps/customer/src/components/ui/QuickCartPopup.jsx',
  'apps/customer/src/components/ui/TenantErrorState.jsx',
  'apps/customer/src/components/ui/WebPushPrompt.jsx',
  'apps/customer/src/components/table/TableServiceActions.jsx',
];

// Ordered replacements (specific first, generic last)
const REPLACEMENTS = [
  // ── Hex colors (case-insensitive inline replacements)
  { from: /#0F3D2E\/60/gi,   to: '#2B1810/60'   },
  { from: /#0F3D2E\/40/gi,   to: '#2B1810/40'   },
  { from: /#0F3D2E\/30/gi,   to: '#7A3316/30'   },
  { from: /#0F3D2E\/20/gi,   to: '#7A3316/20'   },
  { from: /#0F3D2E\/10/gi,   to: '#7A3316/10'   },
  { from: /#0F3D2E/gi,       to: '#7A3316'      },
  { from: /#16503D/gi,       to: '#5E2610'      },
  { from: /#FFF1C9/gi,       to: '#F3E9DC'      },
  // Old red accent CTA (only as CTA bg, not the badge red #E23B2E)
  { from: /bg-\[#C93A1C\]/g, to: 'bg-[#7A3316]' },
  { from: /#C93A1C/g,        to: '#7A3316'      },
  // ── Tailwind stone utility classes → inline warm tokens
  // bg-stone-900 / bg-stone-800 → primary rust
  { from: /\bbg-stone-900\b/g,   to: 'bg-[#7A3316]' },
  { from: /\bbg-stone-800\b/g,   to: 'bg-[#7A3316]' },
  // bg-stone-100 → inactive chip
  { from: /\bbg-stone-100\b/g,   to: 'bg-[#F3E9DC]' },
  // bg-stone-50 → page bg
  { from: /\bbg-stone-50\b/g,    to: 'bg-[#FBF6EF]' },
  // text-stone-900 / text-stone-800 → espresso
  { from: /\btext-stone-900\b/g, to: 'text-[#2B1810]' },
  { from: /\btext-stone-800\b/g, to: 'text-[#2B1810]' },
  // border-stone-200 / border-stone-300 → warm divider
  { from: /\bborder-stone-200\b/g, to: 'border-[#EFE4D6]' },
  { from: /\bborder-stone-300\b/g, to: 'border-[#EFE4D6]' },
  // ring-stone-900 → ring-[#7A3316]
  { from: /\bring-stone-900\b/g,   to: 'ring-[#7A3316]' },
  // focus:ring-stone-900 → focus:ring-[#7A3316]
  { from: /focus:ring-stone-900\b/g, to: 'focus:ring-[#7A3316]' },
  // hover:border-stone-400 → keep as-is (neutral, acceptable)
  // hover:bg-stone-100 → hover:bg-[#F3E9DC]
  { from: /\bhover:bg-stone-100\b/g, to: 'hover:bg-[#F3E9DC]' },
  // hover:bg-stone-200 → hover:bg-[#F3E9DC]
  { from: /\bhover:bg-stone-200\b/g, to: 'hover:bg-[#F3E9DC]' },
  // hover:text-stone-900 → hover:text-[#2B1810]
  { from: /\bhover:text-stone-900\b/g, to: 'hover:text-[#2B1810]' },
  // divide-stone-100 → divide-[#EFE4D6]
  { from: /\bdivide-stone-100\b/g, to: 'divide-[#EFE4D6]' },
  // border-stone-100 → border-[#EFE4D6]
  { from: /\bborder-stone-100\b/g, to: 'border-[#EFE4D6]' },
  // border-dashed border-stone-200 (already covered above)
  // border-t-[#0F3D2E] → border-t-[#7A3316]  (already covered by hex above)
];

// Page-level bg-white → bg-[#FBF6EF] (only when used as root page container)
// We do a targeted pass after the generic replacements.
// The pattern: min-h-screen bg-white  →  min-h-screen bg-[#FBF6EF]
// Also: flex min-h-screen ... bg-white  →  same
const PAGE_BG_REPLACEMENTS = [
  {
    from: /min-h-screen bg-white\b/g,
    to: 'min-h-screen bg-[#FBF6EF]',
  },
  {
    // header/nav bars: bg-white/95 backdrop-blur → bg-[#FFFDF9]/95 backdrop-blur
    from: /\bbg-white\/95\b/g,
    to: 'bg-[#FFFDF9]/95',
  },
  {
    // cards inside sections: rounded-... bg-white border → bg-[#FFFDF9]
    // Only replace bg-white that's paired with a border or rounded class (card surface)
    from: /\bbg-white\b(?=\s[^"]*?(?:border|rounded|shadow))/g,
    to: 'bg-[#FFFDF9]',
  },
];

let totalChanged = 0;

TARGET_FILES.forEach((relPath) => {
  const filePath = path.resolve(process.cwd(), relPath);
  if (!fs.existsSync(filePath)) {
    console.log(`  SKIP (not found): ${relPath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Phase 1: Generic replacements
  REPLACEMENTS.forEach(({ from, to }) => {
    content = content.replace(from, to);
  });

  // Phase 2: Page-level bg-white
  PAGE_BG_REPLACEMENTS.forEach(({ from, to }) => {
    content = content.replace(from, to);
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalChanged++;
    console.log(`  ✅ Updated: ${relPath}`);
  } else {
    console.log(`  -- No change: ${relPath}`);
  }
});

console.log(`\nDone. ${totalChanged} file(s) updated.`);
