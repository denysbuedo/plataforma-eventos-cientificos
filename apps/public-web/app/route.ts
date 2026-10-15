export function GET(request: Request) {
  const target = new URL(request.url); target.pathname = '/es';
  return Response.redirect(target, 307);
}
