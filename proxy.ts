import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login"];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath = PUBLIC_PATHS.some((p) => request.nextUrl.pathname.startsWith(p));

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return redirecionar(url, supabaseResponse);
  }

  if (user && request.nextUrl.pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return redirecionar(url, supabaseResponse);
  }

  return supabaseResponse;
}

/**
 * Redireciona **levando junto** os cookies que a renovação de sessão escreveu.
 *
 * É o detalhe que deslogava a equipe no meio de um cadastro. `getUser()` acima
 * renova o access token quando ele venceu, e o GoTrue **rotaciona** o refresh
 * token: o antigo é consumido no mesmo instante. O par novo é escrito em
 * `supabaseResponse` pelo `setAll`. Um `NextResponse.redirect()` cru é uma
 * resposta nova, sem esses cookies — então o navegador continuava com o token
 * velho, já consumido, e a renovação seguinte voltava "already used". O cliente
 * então emite `SIGNED_OUT` e o AuthListener manda para /login, levando o
 * formulário aberto junto.
 *
 * Não dava para reproduzir em desenvolvimento porque depende de o token ter
 * vencido (~1h) no exato momento em que o caminho passa por um redirect.
 */
function redirecionar(url: URL, comCookiesDe: NextResponse): NextResponse {
  const resposta = NextResponse.redirect(url);
  for (const cookie of comCookiesDe.cookies.getAll()) resposta.cookies.set(cookie);
  return resposta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
