/**
 * ============================================================================
 * Brewhaus Café — Configuration & Dynamic Renderer
 * ============================================================================
 * All text, branding, and link definitions live in this CONFIG object.
 * To add, remove, or modify a button, simply update the `buttons` array.
 */
const CONFIG = {
  // Café branding
  cafeName: "Brewhaus Café",
  tagline: "Artisan Coffee & Kitchen",

  // Visual Assets
  // Set to image path (e.g., "logo.png") or "" to use fallback letter
  logoImage: "",
  logoLetter: "B",

  // Background Image Path or "none" (if "none", radial gradient is used)
  backgroundImage: "none",
  backgroundGradient: "radial-gradient(circle at center, #556b2f 0%, #1d2410 100%)",
  overlayColor: "rgba(20, 26, 10, 0.55)",

  // Button Appearance
  buttonColor: "#788c32",
  buttonOpacity: 0.82,

  // Footer text
  footerText: "© 2026 Brewhaus Café • Table Service",

  // 5 Full-Width Pill Buttons (Rendered in order)
  buttons: [
    {
      id: "menu",
      label: "MENU",
      url: "https://brewhaus.menu",
      iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`
    },
    {
      id: "contact",
      label: "CONTACT",
      url: "tel:+1234567890",
      iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`
    },
    {
      id: "review",
      label: "REVIEW",
      url: "https://g.page/r/brewhaus/review",
      iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
    },
    {
      id: "instagram",
      label: "INSTAGRAM",
      url: "https://instagram.com/brewhauscafe",
      iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>`
    },
    {
      id: "whatsapp",
      label: "WHATSAPP",
      url: "https://wa.me/1234567890",
      iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`
    }
  ]
};

/**
 * Render the page components dynamically from CONFIG
 */
function initCafeHub() {
  // Apply Background
  const bgLayer = document.getElementById("bgLayer");
  if (bgLayer) {
    if (CONFIG.backgroundImage && CONFIG.backgroundImage.toLowerCase() !== "none") {
      bgLayer.style.backgroundImage = `url("${CONFIG.backgroundImage}")`;
    } else {
      bgLayer.style.background = CONFIG.backgroundGradient;
    }
  }

  // Apply Overlay Color
  const overlayLayer = document.getElementById("overlayLayer");
  if (overlayLayer && CONFIG.overlayColor) {
    overlayLayer.style.backgroundColor = CONFIG.overlayColor;
  }

  // Render Logo
  const logoWrapper = document.getElementById("logoWrapper");
  if (logoWrapper) {
    logoWrapper.innerHTML = "";
    if (CONFIG.logoImage && CONFIG.logoImage.trim() !== "") {
      const img = document.createElement("img");
      img.src = CONFIG.logoImage;
      img.alt = `${CONFIG.cafeName} Logo`;
      img.className = "logo-img";
      img.onerror = () => {
        // Fallback to letter on image loading failure
        renderLogoFallback(logoWrapper, CONFIG.logoLetter);
      };
      logoWrapper.appendChild(img);
    } else {
      renderLogoFallback(logoWrapper, CONFIG.logoLetter);
    }
  }

  // Render Café Name & Tagline
  const cafeNameEl = document.getElementById("cafeName");
  if (cafeNameEl) {
    cafeNameEl.textContent = CONFIG.cafeName;
  }

  const taglineEl = document.getElementById("tagline");
  if (taglineEl) {
    taglineEl.textContent = CONFIG.tagline;
  }

  // Render Footer Text
  const footerTextEl = document.getElementById("footerText");
  if (footerTextEl) {
    footerTextEl.textContent = CONFIG.footerText;
  }

  // Render Buttons
  const linksNav = document.getElementById("linksNav");
  if (linksNav) {
    linksNav.innerHTML = "";

    // Convert hex button color to rgba if opacity is set
    const btnBg = hexToRgba(CONFIG.buttonColor, CONFIG.buttonOpacity);

    CONFIG.buttons.forEach((btnConfig) => {
      const a = document.createElement("a");
      a.className = "btn";
      a.href = btnConfig.url;
      a.id = `btn-${btnConfig.id}`;
      a.setAttribute("aria-label", btnConfig.label);
      
      if (btnBg) {
        a.style.backgroundColor = btnBg;
      }

      // Link Target Specification:
      // http(s) links open in a new tab with rel="noopener";
      // tel: and wa.me links open normally.
      const isHttp = /^https?:\/\//i.test(btnConfig.url);
      const isWaMe = /^https?:\/\/wa\.me\//i.test(btnConfig.url) || /^wa\.me\//i.test(btnConfig.url);

      if (isHttp && !isWaMe) {
        a.target = "_blank";
        a.rel = "noopener";
      } else {
        a.target = "_self";
      }

      // Icon Chip
      const iconChip = document.createElement("div");
      iconChip.className = "icon-chip";
      iconChip.setAttribute("aria-hidden", "true");
      iconChip.innerHTML = btnConfig.iconSvg;
      a.appendChild(iconChip);

      // Centered Text Label
      const labelSpan = document.createElement("span");
      labelSpan.className = "btn-label";
      labelSpan.textContent = btnConfig.label;
      a.appendChild(labelSpan);

      linksNav.appendChild(a);
    });
  }
}

/**
 * Render circular fallback letter for the logo
 */
function renderLogoFallback(container, letter) {
  container.innerHTML = "";
  const fallbackSpan = document.createElement("span");
  fallbackSpan.className = "logo-fallback";
  fallbackSpan.textContent = letter || "B";
  container.appendChild(fallbackSpan);
}

/**
 * Helper to convert hex (#RRGGBB) to rgba string
 */
function hexToRgba(hex, alpha = 1) {
  if (!hex || !hex.startsWith("#")) return hex;
  const cleanHex = hex.slice(1);
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } else if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

// Initialize on DOMContentLoaded or immediately if ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCafeHub);
} else {
  initCafeHub();
}
