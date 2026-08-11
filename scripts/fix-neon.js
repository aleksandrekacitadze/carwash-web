const fs = require("fs");
const path = require("path");

function walk(d, a = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f, a);
    else if (/\.tsx?$/.test(e.name)) a.push(f);
  }
  return a;
}

let n = 0;
for (const file of walk("src")) {
  let s = fs.readFileSync(file, "utf8");
  const b = s;
  s = s.replace(/rgba\(60,255,177,0\.\d+\)/g, "var(--accent-soft)");
  s = s.replace(/#c8ffe7/gi, "var(--accent-ink)");
  s = s.replace(
    /border:\s*"1px solid var\(--accent-soft\)"/g,
    'border: "1px solid var(--line)"',
  );
  if (s !== b) {
    fs.writeFileSync(file, s);
    n++;
    console.log(file);
  }
}
console.log("fixed", n);
