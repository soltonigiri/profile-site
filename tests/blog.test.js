import { describe, expect, it } from "vitest";

import { parseFeed } from "../functions/api/blog.js";

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
