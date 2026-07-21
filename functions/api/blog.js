const FEED_URL = "https://sizu.me/soltonigiri/rss";
const ARTICLE_URL_PREFIX = "https://sizu.me/soltonigiri/posts/";

function readTag(source, tagName) {
  const match = source.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)</${tagName}>`, "i"));
  return match?.[1]?.replace(/^<!\[CDATA\[|\]\]>$/g, "").trim() ?? "";
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
    if (code.startsWith("#x")) return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
    if (code.startsWith("#")) return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
    return entities[code.toLowerCase()] ?? entity;
  });
}

function parseFeed(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)]
    .map((match) => {
      const item = match[1];
      const title = decodeXml(readTag(item, "title"));
      const url = decodeXml(readTag(item, "link"));
      const publishedAt = readTag(item, "pubDate");

      return { title, url, publishedAt };
    })
    .filter((post) => post.title && post.url.startsWith(ARTICLE_URL_PREFIX))
    .slice(0, 10);
}

export async function onRequestGet() {
  try {
    const response = await fetch(FEED_URL, {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml",
        "User-Agent": "soltonigiri-profile-site/1.0",
      },
    });

    if (!response.ok) {
      return Response.json(
        { posts: [], error: "feed_unavailable" },
        {
          status: 502,
          headers: {
            "Cache-Control": "no-store",
            "Referrer-Policy": "no-referrer",
            "X-Content-Type-Options": "nosniff",
          },
        },
      );
    }

    const posts = parseFeed(await response.text());

    return Response.json(
      { posts },
      {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=1800",
          "Referrer-Policy": "no-referrer",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch {
    return Response.json(
      { posts: [], error: "feed_unavailable" },
      {
        status: 502,
        headers: {
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }
}
