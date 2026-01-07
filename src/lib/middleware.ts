// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protect specific routes
  if (request.nextUrl.pathname.startsWith('/profile') && !session) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  if (request.nextUrl.pathname.startsWith('/manufacturer-dashboard') && !session) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  if (request.nextUrl.pathname.startsWith('/checkout') && !session) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  return res;
}

export const config = {
  matcher: ['/profile/:path*', '/manufacturer-dashboard/:path*', '/checkout/:path*'],
};