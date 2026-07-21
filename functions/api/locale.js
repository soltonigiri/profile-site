export function onRequestGet({ request }) {
  const country = request.cf?.country ?? null;
  const language = country === "JP" ? "ja" : country ? "en" : null;

  return Response.json(
    { language },
    {
      headers: {
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
