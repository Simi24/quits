// The Worker entry. Static assets are served by the assets binding before this
// runs; the API arrives in S3 (SPEC.md §6). Until then every request that reaches
// the Worker is unknown.
export default {
  fetch(_request: Request): Response {
    return Response.json({ error: "not_found" }, { status: 404 });
  },
} satisfies ExportedHandler;
