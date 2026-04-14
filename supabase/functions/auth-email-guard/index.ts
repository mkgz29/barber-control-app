import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BLOCKED_DOMAINS = new Set([
  "example.com",
  "example.net",
  "example.org",
  "invalid",
  "localhost",
  "local",
  "test",
]);

const FLOW_CONFIG = {
  signup: {
    cooldownSeconds: 90,
    maxAttempts: 3,
    windowMinutes: 15,
  },
  magic_link: {
    cooldownSeconds: 90,
    maxAttempts: 3,
    windowMinutes: 15,
  },
  password_reset: {
    cooldownSeconds: 120,
    maxAttempts: 3,
    windowMinutes: 15,
  },
  resend_confirmation: {
    cooldownSeconds: 120,
    maxAttempts: 3,
    windowMinutes: 15,
  },
} as const;

type Flow = keyof typeof FLOW_CONFIG;

function json(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizeEmail(value: unknown) {
  const rawValue = String(value ?? "");
  const compactValue = rawValue.replace(/\s+/g, "").trim();
  const atIndex = compactValue.lastIndexOf("@");

  if (atIndex === -1) {
    return compactValue;
  }

  return `${compactValue.slice(0, atIndex)}@${compactValue.slice(atIndex + 1).toLowerCase()}`;
}

function validateEmail(value: unknown) {
  const email = normalizeEmail(value);

  if (!email) {
    return { ok: false, email, message: "Ingresá tu email." };
  }

  if (email.length > 254 || !EMAIL_REGEX.test(email) || email.includes("..")) {
    return { ok: false, email, message: "Ingresá un email válido." };
  }

  const [localPart, domain] = email.split("@");

  if (!localPart || !domain || BLOCKED_DOMAINS.has(domain)) {
    return { ok: false, email, message: "Ese email no es válido para entrega." };
  }

  const labels = domain.split(".");
  const hasInvalidLabel = labels.some(
    (label) => !label || label.startsWith("-") || label.endsWith("-")
  );

  if (labels.length < 2 || hasInvalidLabel || labels.at(-1)!.length < 2) {
    return { ok: false, email, message: "Ingresá un email válido." };
  }

  return { ok: true, email, message: "" };
}

function getClientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const { flow, email } = (await request.json()) as { flow?: Flow; email?: string };

    if (!flow || !(flow in FLOW_CONFIG)) {
      return json(400, { error: "Flow inválido." });
    }

    const validation = validateEmail(email);
    if (!validation.ok) {
      return json(400, { error: validation.message });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, { error: "Faltan variables del backend." });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const config = FLOW_CONFIG[flow];
    const { data, error } = await supabaseAdmin.rpc("consume_auth_email_attempt", {
      p_email: validation.email,
      p_flow: flow,
      p_ip: getClientIp(request),
      p_user_agent: request.headers.get("user-agent"),
      p_cooldown_seconds: config.cooldownSeconds,
      p_window_minutes: config.windowMinutes,
      p_max_attempts: config.maxAttempts,
    });

    if (error) {
      console.error("auth-email-guard rpc error", error);
      return json(500, { error: "No pudimos validar el intento." });
    }

    const result = Array.isArray(data) ? data[0] : data;

    return json(200, {
      allowed: result?.allowed ?? false,
      retryAfterSeconds: result?.retry_after_seconds ?? 0,
      message: result?.message ?? "",
      normalizedEmail: validation.email,
    });
  } catch (error) {
    console.error("auth-email-guard unexpected error", error);
    return json(500, { error: "Error inesperado." });
  }
});
