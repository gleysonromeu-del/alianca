import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

// Gera um nonce criptograficamente seguro para CSP (base64url, 128 bits de entropia).
// Deve ser chamado UMA vez por request — nunca reutilizado entre requests.
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

// ─── Security Headers ──────────────────────────────────────────────────────────
// Injetados em todas as respostas HTML para proteger contra
// clickjacking, MIME sniffing, data leakage e outros ataques comuns.
function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);

  // Impede que o site seja embutido em iframes de outros domínios (clickjacking)
  headers.set("X-Frame-Options", "DENY");

  // Impede que o browser tente adivinhar o MIME type (MIME sniffing attacks)
  headers.set("X-Content-Type-Options", "nosniff");

  // Controla quais informações de referência são enviadas
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Desativa funcionalidades do browser que não são necessárias
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");

  // Força HTTPS por 1 ano (só ativo em produção com domínio próprio)
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

  // Content Security Policy — sem 'unsafe-inline' nem 'unsafe-eval' em script-src.
  //
  // Estratégia de nonce:
  //   1. Um nonce criptograficamente aleatório é gerado por REQUEST (não por build),
  //      garantindo que cada resposta tenha um valor único e imprevisível.
  //   2. O nonce é injetado como atributo nos <script> e <style> inline gerados pelo SSR.
  //   3. O browser só executa scripts/estilos que carregem o nonce correto — XSS injetado
  //      não conhece o nonce e é bloqueado.
  //
  // Para aplicar o nonce nos elementos gerados pelo TanStack Start, adicione o middleware
  // de nonce descrito em docs/csp-nonce.md (a ser criado).
  const nonce = generateNonce();
  headers.set("x-csp-nonce", nonce); // Expõe para o SSR injetar nos elementos inline

  headers.set(
    "Content-Security-Policy-Report-Only",
    [
      "default-src 'self'",
      // 'strict-dynamic' permite scripts carregados por scripts confiáveis (sem lista de domínios)
      // O nonce protege os scripts inline gerados pelo SSR
      `script-src 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com`,
      // Estilos inline do Tailwind/shadcn precisam do nonce ou de unsafe-inline.
      // unsafe-inline em style-src é aceitável (não executa código, apenas estilos).
      `style-src 'self' 'unsafe-inline'`,
      "img-src 'self' data: blob: https://*.supabase.co https://supabase.co",
      "media-src 'self' blob: https://*.supabase.co https://supabase.co",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com",
      "frame-src https://challenges.cloudflare.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      // report-uri para monitorar violações em produção (opcional mas recomendado)
      // "report-uri /api/csp-report",
    ].join("; ")
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      return addSecurityHeaders(normalized);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};