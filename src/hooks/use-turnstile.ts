import { useEffect, useRef, useState, useCallback } from "react";

const TURNSTILE_SITE_KEY = "0x4AAAAAADfjBLGVeSt2NbqD";
const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: object) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

function loadTurnstileScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Já carregado
    if (typeof window !== "undefined" && window.turnstile) {
      resolve();
      return;
    }
    // Script já no DOM
    if (document.querySelector(`script[src^="https://challenges.cloudflare.com"]`)) {
      const check = setInterval(() => {
        if (window.turnstile) { clearInterval(check); resolve(); }
      }, 100);
      setTimeout(() => { clearInterval(check); reject(new Error("Turnstile timeout")); }, 10000);
      return;
    }
    // Adiciona script
    const script = document.createElement("script");
    script.src = TURNSTILE_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const check = setInterval(() => {
        if (window.turnstile) { clearInterval(check); resolve(); }
      }, 50);
      setTimeout(() => { clearInterval(check); reject(new Error("Turnstile não inicializou")); }, 8000);
    };
    script.onerror = () => reject(new Error("Falha ao carregar Turnstile"));
    document.head.appendChild(script);
  });
}

export function useTurnstile() {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const mountWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile) return;
    // Remove widget anterior se existir
    if (widgetIdRef.current) {
      try { window.turnstile.remove(widgetIdRef.current); } catch {}
      widgetIdRef.current = null;
    }
    // Limpa o container
    containerRef.current.innerHTML = "";
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: (t: string) => setToken(t),
      "expired-callback": () => setToken(null),
      "error-callback": () => { setToken(null); },
      theme: "dark",
      language: "pt-BR",
    });
  }, []);

  useEffect(() => {
    loadTurnstileScript()
      .then(mountWidget)
      .catch((err) => console.warn("Turnstile:", err));

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch {}
        widgetIdRef.current = null;
      }
    };
  }, [mountWidget]);

  const reset = useCallback(() => {
    setToken(null);
    if (widgetIdRef.current && window.turnstile) {
      try { window.turnstile.reset(widgetIdRef.current); } catch {}
    }
  }, []);

  return { containerRef, token, reset };
}