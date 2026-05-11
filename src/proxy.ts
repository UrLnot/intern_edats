import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, getSessionToken } from '@/lib/auth';

type RateBucket = { resetAt: number; count: number };
const rateBuckets = new Map<string, RateBucket>();

const getClientIp = (request: NextRequest) => {
  const forwardedFor = (request.headers.get('x-forwarded-for') || '').trim();
  if (forwardedFor) return forwardedFor.split(',')[0]?.trim() || forwardedFor;
  const realIp = (request.headers.get('x-real-ip') || '').trim();
  if (realIp) return realIp;
  const ip = (request as any).ip;
  return typeof ip === 'string' && ip.trim() ? ip.trim() : 'unknown';
};

const isRateLimited = (key: string, limit: number, windowMs: number) => {
  const now = Date.now();
  const existing = rateBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    rateBuckets.set(key, { resetAt: now + windowMs, count: 1 });
    return false;
  }
  existing.count += 1;
  rateBuckets.set(key, existing);
  return existing.count > limit;
};

const applySecurityHeaders = (response: NextResponse, request: NextRequest) => {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store');
  }
  return response;
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = session === getSessionToken();

  const isLoginPage = pathname.startsWith('/login');
  const isAuthApi = pathname.startsWith('/api/auth');
  const isProtectedApi = pathname.startsWith('/api/');
  const isPublicAsset =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/file.svg') ||
    pathname.startsWith('/globe.svg') ||
    pathname.startsWith('/next.svg') ||
    pathname.startsWith('/vercel.svg') ||
    pathname.startsWith('/window.svg');

  if (isPublicAsset) {
    return NextResponse.next();
  }

  const method = request.method.toUpperCase();
  const ip = getClientIp(request);
  if (pathname === '/api/auth/login' && method === 'POST') {
    const limited = isRateLimited(`login:${ip}`, 20, 60_000);
    if (limited) {
      const res = NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      res.headers.set('Retry-After', '60');
      return applySecurityHeaders(res, request);
    }
  } else if (isProtectedApi && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
    const limited = isRateLimited(`mut:${ip}`, 120, 60_000);
    if (limited) {
      const res = NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      res.headers.set('Retry-After', '60');
      return applySecurityHeaders(res, request);
    }
  }

  if (!isAuthenticated && !isLoginPage && !isAuthApi) {
    if (isProtectedApi) {
      return applySecurityHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), request);
    }
    const loginUrl = new URL('/login', request.url);
    return applySecurityHeaders(NextResponse.redirect(loginUrl), request);
  }

  if (isAuthenticated && isLoginPage) {
    const homeUrl = new URL('/', request.url);
    return applySecurityHeaders(NextResponse.redirect(homeUrl), request);
  }

  return applySecurityHeaders(NextResponse.next(), request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (handled inside proxy)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (svg, png, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};
