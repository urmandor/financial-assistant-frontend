export async function onRequest(context) {
  const url = new URL(context.request.url);
  const backendTarget = `https://financial-assistant-backend.menuvis.workers.dev${url.pathname}${url.search}`;

  const headers = new Headers(context.request.headers);
  headers.set('Origin', 'https://financial-assistant-a4x.pages.dev');
  headers.set('Host', 'financial-assistant-backend.menuvis.workers.dev');

  const reqInit = {
    method: context.request.method,
    headers,
    redirect: 'follow',
  };

  if (!['GET', 'HEAD'].includes(context.request.method)) {
    reqInit.body = context.request.body;
  }

  const response = await fetch(backendTarget, reqInit);

  const responseHeaders = new Headers(response.headers);
  responseHeaders.set('Access-Control-Allow-Origin', url.origin);
  responseHeaders.set('Access-Control-Allow-Credentials', 'true');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export async function onRequestOptions(context) {
  const url = new URL(context.request.url);
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': url.origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  });
}
