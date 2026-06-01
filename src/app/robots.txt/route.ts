export function GET() {
  return new Response(
    `User-agent: *
Allow: /
Disallow: /api/

Sitemap: https://thread-lens-gilt.vercel.app/sitemap.xml
`,
    { headers: { 'Content-Type': 'text/plain' } },
  );
}
