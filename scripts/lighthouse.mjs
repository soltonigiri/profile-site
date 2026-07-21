import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";

const targets = [
  { name: "ja", url: "http://127.0.0.1:8788/" },
  { name: "en", url: "http://127.0.0.1:8788/en/" },
];

const thresholds = {
  performance: 0.9,
  accessibility: 0.95,
  "best-practices": 0.95,
  seo: 0.95,
};

const chromeDataDirectory = await mkdtemp(join(tmpdir(), "profile-site-lighthouse-"));
const chrome = await launch({
  chromePath: process.env.CHROME_PATH,
  chromeFlags: [
    "--headless",
    "--no-sandbox",
    "--disable-gpu",
    `--user-data-dir=${chromeDataDirectory}`,
  ],
  userDataDir: false,
});

let failed = false;

try {
  await mkdir(".lighthouseci", { recursive: true });

  for (const target of targets) {
    const result = await lighthouse(target.url, {
      logLevel: "error",
      output: "json",
      onlyCategories: Object.keys(thresholds),
      port: chrome.port,
    });

    if (!result) throw new Error(`Lighthouse returned no result for ${target.url}`);

    await writeFile(`.lighthouseci/${target.name}.json`, JSON.stringify(result.lhr, null, 2));

    for (const [category, minimum] of Object.entries(thresholds)) {
      const score = result.lhr.categories[category]?.score ?? 0;
      console.log(`${target.name} ${category}: ${Math.round(score * 100)}`);
      if (score < minimum) failed = true;
    }
  }
} finally {
  await chrome.kill();
  await rm(chromeDataDirectory, { force: true, recursive: true });
}

if (failed) process.exitCode = 1;
