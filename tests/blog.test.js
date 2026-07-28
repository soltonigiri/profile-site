import { afterEach, describe, expect, it, vi } from "vitest";

import { onRequestGet, parseFeed } from "../functions/api/blog.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseFeed", () => {
  it("parses, decodes, and limits trusted Sizu posts", () => {
    const xml = `
      <rss><channel>
        <item>
          <title><![CDATA[AI &amp; indie development]]></title>
          <link>https://sizu.me/soltonigiri/posts/example</link>
          <pubDate>Tue, 21 Jul 2026 00:16:28 GMT</pubDate>
        </item>
        <item>
          <title>Untrusted</title>
          <link>https://example.com/posts/not-allowed</link>
          <pubDate>Tue, 21 Jul 2026 00:16:28 GMT</pubDate>
        </item>
      </channel></rss>
    `;

    expect(parseFeed(xml)).toEqual([
      {
        title: "AI & indie development",
        url: "https://sizu.me/soltonigiri/posts/example",
        publishedAt: "Tue, 21 Jul 2026 00:16:28 GMT",
      },
    ]);
  });

  it("keeps invalid numeric entities inert instead of throwing", () => {
    const xml = `
      <item>
        <title>Invalid &#x110000;</title>
        <link>https://sizu.me/soltonigiri/posts/example</link>
        <pubDate>Tue, 21 Jul 2026 00:16:28 GMT</pubDate>
      </item>
    `;

    expect(parseFeed(xml)[0].title).toBe("Invalid &#x110000;");
  });
});

describe("onRequestGet", () => {
  it("uses a new cache namespace and does not let browsers retain the article list", async () => {
    const match = vi.fn().mockResolvedValue(
      Response.json(
        { posts: [] },
        {
          headers: {
            "Cache-Control": "public, max-age=300",
          },
        },
      ),
    );
    vi.stubGlobal("caches", { default: { match } });

    const response = await onRequestGet({
      request: new Request("https://profile.example/api/blog"),
      waitUntil: vi.fn(),
    });

    expect(match).toHaveBeenCalledOnce();
    expect(match.mock.calls[0][0].url).toBe("https://profile.example/api/blog?cache=privacy-v2");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Profile-Cache")).toBe("HIT");
  });

  it("keeps the internal article-list cache to five minutes", async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("caches", {
      default: {
        match: vi.fn().mockResolvedValue(undefined),
        put,
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          `
            <rss><channel><item>
              <title>Public post</title>
              <link>https://sizu.me/soltonigiri/posts/public-post</link>
              <pubDate>Tue, 21 Jul 2026 00:16:28 GMT</pubDate>
            </item></channel></rss>
          `,
          { status: 200 },
        ),
      ),
    );
    const backgroundTasks = [];

    const response = await onRequestGet({
      request: new Request("https://profile.example/api/blog"),
      waitUntil: (task) => backgroundTasks.push(task),
    });
    await Promise.all(backgroundTasks);

    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Profile-Cache")).toBe("MISS");
    expect(put).toHaveBeenCalledOnce();
    expect(put.mock.calls[0][1].headers.get("Cache-Control")).toBe("public, max-age=300");
  });
});
