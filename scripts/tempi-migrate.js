/**
 * Bulk Tempi theme migration for inline-style pages.
 * Converts old dark neon palette to CSS-variable light theme.
 */
const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");

const roots = [
  path.join(rootDir, "src", "app"),
  path.join(rootDir, "src", "components"),
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx|ts)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const skip = new Set([
  // Already Tempi / intentional
  path.normalize("src/app/customer/dashboard/page.tsx"),
  path.normalize("src/app/customer/booked/page.tsx"),
  path.normalize("src/app/auth/page.tsx"),
  path.normalize("src/app/auth/verify/page.tsx"),
  path.normalize("src/app/page.tsx"),
  path.normalize("src/app/layout.tsx"),
  path.normalize("src/components/LiveWeatherBar.tsx"),
  path.normalize("src/components/SiteFooter.tsx"),
  path.normalize("src/components/MotionPage.tsx"),
  path.normalize("src/lib/firebaseClient.ts"),
]);

function shouldSkip(file) {
  const rel = path.relative(rootDir, file).replace(/\\/g, "/");
  return [
    "src/app/customer/dashboard/page.tsx",
    "src/app/customer/booked/page.tsx",
    "src/app/auth/page.tsx",
    "src/app/auth/verify/page.tsx",
    "src/app/page.tsx",
    "src/app/layout.tsx",
    "src/components/LiveWeatherBar.tsx",
    "src/components/SiteFooter.tsx",
    "src/components/MotionPage.tsx",
  ].includes(rel);
}

function transform(src) {
  let s = src;
  const before = s;

  // Page / panel backgrounds
  s = s.replace(/background:\s*"#0b0f19"/g, 'background: "transparent"');
  s = s.replace(/background:\s*"#07111f"/g, 'background: "transparent"');
  s = s.replace(/background:\s*"#050914"/g, 'background: "var(--surface)"');
  s = s.replace(/background:\s*"#0a0f1a"/g, 'background: "transparent"');
  s = s.replace(/background:\s*"#0f172a"/g, 'background: "var(--surface)"');
  s = s.replace(/background:\s*"#111827"/g, 'background: "var(--ink)"');
  s = s.replace(/background:\s*"#020617"/g, 'background: "transparent"');

  // Accent
  s = s.replace(/#3cffb1/gi, "var(--accent)");
  s = s.replace(/#062112/gi, "#ffffff");
  s = s.replace(/#ffd166/gi, "#e8b84a");

  // Cards / glass
  s = s.replace(/background:\s*"rgba\(255,255,255,0\.06\)"/g, 'background: "var(--surface)"');
  s = s.replace(/background:\s*"rgba\(255,255,255,0\.08\)"/g, 'background: "var(--surface-2)"');
  s = s.replace(/background:\s*"rgba\(255,255,255,0\.10\)"/g, 'background: "var(--surface-2)"');
  s = s.replace(/background:\s*"rgba\(255,255,255,0\.12\)"/g, 'background: "var(--surface-2)"');
  s = s.replace(/background:\s*"rgba\(255,255,255,0\.14\)"/g, 'background: "var(--surface-2)"');
  s = s.replace(/background:\s*"rgba\(255,255,255,0\.18\)"/g, 'background: "var(--accent-soft)"');
  s = s.replace(/background:\s*"rgba\(0,0,0,0\.15\)"/g, 'background: "var(--surface-2)"');
  s = s.replace(/background:\s*"rgba\(0,0,0,0\.16\)"/g, 'background: "var(--surface-2)"');
  s = s.replace(/background:\s*"rgba\(0,0,0,0\.18\)"/g, 'background: "var(--surface-2)"');
  s = s.replace(/background:\s*"rgba\(0,0,0,0\.20\)"/g, 'background: "#fff"');
  s = s.replace(/background:\s*"rgba\(0,0,0,0\.22\)"/g, 'background: "#fff"');
  s = s.replace(/background:\s*"rgba\(0,0,0,0\.2\)"/g, 'background: "#fff"');
  s = s.replace(/background:\s*"rgba\(0,0,0,0\.45\)"/g, 'background: "rgba(19,37,43,0.45)"');
  s = s.replace(/background:\s*"rgba\(0,0,0,0\.72\)"/g, 'background: "rgba(19,37,43,0.45)"');

  // Borders
  s = s.replace(/1px solid rgba\(255,255,255,0\.\d+\)/g, "1px solid var(--line)");
  s = s.replace(/1px dashed rgba\(255,255,255,0\.\d+\)/g, "1px dashed var(--line)");

  // Text / base colors on dark pages
  s = s.replace(/color:\s*"#fff"/g, 'color: "var(--ink)"');
  s = s.replace(/color:\s*"#ffffff"/gi, 'color: "var(--ink)"');
  s = s.replace(/color:\s*"rgba\(255,255,255,0\.86\)"/g, 'color: "var(--ink)"');
  s = s.replace(/color:\s*"rgba\(255,255,255,0\.78\)"/g, 'color: "var(--ink-soft)"');
  s = s.replace(/color:\s*"#e8fff5"/g, 'color: "var(--accent-ink)"');
  s = s.replace(/color:\s*"#ffb4b4"/g, 'color: "var(--danger)"');
  s = s.replace(/color:\s*"#2b2100"/g, 'color: "var(--ink)"');

  // Fonts
  s = s.replace(
    /fontFamily:\s*"ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial"/g,
    'fontFamily: "var(--font-sans)"',
  );
  s = s.replace(
    /fontFamily:\s*"ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial"/g,
    'fontFamily: "var(--font-sans)"',
  );

  // Restore white text on accent / ink buttons (common patterns after color swap)
  s = s.replace(
    /background:\s*"var\(--accent\)",\s*\n(\s*)color:\s*"var\(--ink\)"/g,
    'background: "var(--accent)",\n$1color: "#fff"',
  );
  s = s.replace(
    /background:\s*"var\(--ink\)",\s*\n(\s*)color:\s*"var\(--ink\)"/g,
    'background: "var(--ink)",\n$1color: "#fff"',
  );
  // Same-line variants
  s = s.replace(
    /background:\s*"var\(--accent\)",\s*color:\s*"var\(--ink\)"/g,
    'background: "var(--accent)", color: "#fff"',
  );
  s = s.replace(
    /background:\s*"var\(--ink\)",\s*color:\s*"var\(--ink\)"/g,
    'background: "var(--ink)", color: "#fff"',
  );

  // Soft shadow for cards that had none
  if (s !== before && !s.includes("boxShadow: \"var(--shadow)\"") && s.includes('background: "var(--surface)"')) {
    // light touch only — skip auto shadow injection
  }

  return s;
}

const files = roots.flatMap((r) => walk(r));
let changed = 0;
for (const file of files) {
  if (shouldSkip(file)) continue;
  const src = fs.readFileSync(file, "utf8");
  if (!/#0b0f19|#3cffb1|rgba\(255,255,255,0\.0|#111827|#07111f|#050914/.test(src)) {
    continue;
  }
  const next = transform(src);
  if (next !== src) {
    fs.writeFileSync(file, next, "utf8");
    changed++;
    console.log("updated", path.relative(rootDir, file));
  }
}
console.log(`Done. Updated ${changed} files.`);
