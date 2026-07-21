const FEED_URL = "https://sizu.me/soltonigiri/rss";
const ARTICLE_ORIGIN = "https://sizu.me";
const ARTICLE_PATH_PREFIX = "/soltonigiri/posts/";
const FETCH_TIMEOUT_MS = 5_000;
const MAX_FEED_BYTES = 512 * 1024;
const REFRESH_AFTER_MS = 30 * 60 * 1_000;
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;
const BROWSER_TTL_SECONDS = 5 * 60;

const API_SECURITY_HEADERS = {
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex",
};

function readTag(source, tagName) {
  const match = source.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)</${tagName}>`, "i"));
  return match?.[1]?.replace(/^<!\[CDATA\[|\]\]>$/g, "").trim() ?? "";
}

function decodeCodePoint(code, entity) {
  const radix = code.startsWith("#x") ? 16 : 10;
  const digits = code.slice(radix === 16 ? 2 : 1);
  const value = Number.parseInt(digits, radix);

  if (!Number.isInteger(value) || value < 0 || value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff)) {
    return entity;
  }

  return String.fromCodePoint(value);
}

function decodeXml(value) {
  const entities = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    quot: '"',
  };

  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code) => {
    if (code.startsWith("#")) return decodeCodePoint(code.toLowerCase(), entity);
    return entities[code.toLowerCase()] ?? entity;
  });
}

function normalizeArticleUrl(value) {
  try {
    const url = new URL(value);
    if (url.origin !== ARTICLE_ORIGIN || !url.pathname.startsWith(ARTICLE_PATH_PREFIX)) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function parseFeed(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)]
    .map((match) => {
      const item = match[1];
      const title = decodeXml(readTag(item, "title"));
      const url = normalizeArticleUrl(decodeXml(readTag(item, "link")));
      const publishedAt = readTag(item, "pubDate");

      return { title, url, publishedAt };
    })
    .filter((post) => post.title && post.url)
    .slice(0, 10);
}

async function readBoundedText(response) {
  const contentLength = Number(response.headers.get("Content-Length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_FEED_BYTES) {
    throw new Error("feed_too_large");
  }

  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    bytesRead += value.byteLength;
    if (bytesRead > MAX_FEED_BYTES) {
      await reader.cancel("feed_too_large");
      throw new Error("feed_too_large");
    }
    text += decoder.decode(value, { stream: true });
  }

  return text + decoder.decode();
}

function createStoredResponse(posts) {
  return Response.json(
    { posts },
    {
      headers: {
        ...API_SECURITY_HEADERS,
        "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}`,
        "X-Profile-Fetched-At": new Date().toISOString(),
      },
    },
  );
}

function createClientResponse(response, cacheStatus) {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", `public, max-age=${BROWSER_TTL_SECONDS}`);
  headers.set("X-Profile-Cache", cacheStatus);
  headers.delete("X-Profile-Fetched-At");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function createErrorResponse() {
  return Response.json(
    { posts: [], error: "feed_unavailable" },
    {
      status: 502,
      headers: {
        ...API_SECURITY_HEADERS,
        "Cache-Control": "no-store",
      },
    },
  );
}

function logError(event, error) {
  console.error(
    JSON.stringify({
      event,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
}

async function fetchFeed() {
  const response = await fetch(FEED_URL, {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml",
      "User-Agent": "soltonigiri-profile-site/1.0",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) throw new Error(`feed_http_${response.status}`);

  return createStoredResponse(parseFeed(await readBoundedText(response)));
}

function isRefreshDue(response) {
  const fetchedAt = Date.parse(response.headers.get("X-Profile-Fetched-At") ?? "");
  return !Number.isFinite(fetchedAt) || Date.now() - fetchedAt >= REFRESH_AFTER_MS;
}

export async function onRequestGet(context) {
  const cache = caches.default;
  const cacheUrl = new URL("/api/blog", context.request.url);
  const cacheKey = new Request(cacheUrl.toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);

  if (cached) {
    const refreshDue = isRefreshDue(cached);
    if (refreshDue) {
      context.waitUntil(
        fetchFeed()
          .then((response) => cache.put(cacheKey, response))
          .catch((error) => {
            logError("blog_feed_background_refresh_failed", error);
          }),
      );
    }

    return createClientResponse(cached, refreshDue ? "STALE" : "HIT");
  }

  try {
    const response = await fetchFeed();
    context.waitUntil(
      cache.put(cacheKey, response.clone()).catch((error) => {
        logError("blog_feed_cache_write_failed", error);
      }),
    );
    return createClientResponse(response, "MISS");
  } catch (error) {
    logError("blog_feed_refresh_failed", error);
    return createErrorResponse();
  }
}
