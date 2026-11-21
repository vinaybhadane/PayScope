const assert = require("node:assert/strict");

// Check the HTML/CSS boundary: a successful build alone does not catch a
// loader returning an empty CSS Module object.
async function checkLandingStyles(baseUrl = "http://localhost:3000") {
  const response = await fetch(baseUrl);
  assert.equal(response.status, 200, "Landing page must load successfully");
  const html = await response.text();
  const cssUrls = [...html.matchAll(/<link\b[^>]*>/g)]
    .map(([tag]) => {
      if (!/rel="stylesheet"/.test(tag)) return null;
      return tag.match(/href="([^"]+)"/)?.[1];
    })
    .filter(Boolean);
  assert(cssUrls.length > 0, "Landing page must include its stylesheets");

  const stylesheets = await Promise.all(cssUrls.map(async (url) => {
    const cssResponse = await fetch(new URL(url.replaceAll("&amp;", "&"), baseUrl));
    assert.equal(cssResponse.status, 200, `Stylesheet must load: ${url}`);
    return cssResponse.text();
  }));
  const css = stylesheets.join("\n");
  const elements = [
    ["header", /<header\b[^>]*>/],
    ["hero", /<section\b[^>]*aria-labelledby="hero-title"[^>]*>/],
    ["headline", /<h1\b[^>]*id="hero-title"[^>]*>/],
    ["phone image", /<img\b[^>]*src="[^"]*holdingPhone[^>]*>/],
  ];

  for (const [name, pattern] of elements) {
    const tag = html.match(pattern)?.[0];
    assert(tag, `${name} must be present`);
    const classNames = tag.match(/class="([^"]+)"/)?.[1].split(/\s+/);
    assert(classNames?.length, `${name} must have exported CSS Module classes`);
    for (const className of classNames) {
      const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      assert(new RegExp(`\\.${escaped}(?=[\\s:{.,>+~#])`).test(css), `${name} class must exist in served CSS: ${className}`);
    }
  }

  assert(/\.flex\s*\{[^}]*display:\s*flex/.test(css), "Global Tailwind utilities must still be generated");
  console.log(`Landing styles passed at ${baseUrl}: header, hero, headline, phone image, stylesheets, and Tailwind utilities.`);
}

checkLandingStyles(process.argv[2]).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
