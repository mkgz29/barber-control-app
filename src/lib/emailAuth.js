const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const DEFAULT_COOLDOWN_SECONDS = 60;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_MAX_ATTEMPTS = 3;
const STORAGE_PREFIX = "auth-email-guard";

const BLOCKED_DOMAINS = new Set([
  "example.com",
  "example.net",
  "example.org",
  "invalid",
  "localhost",
  "local",
  "test",
]);

const DOMAIN_SUGGESTIONS = {
  "gmai.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gmial.com": "gmail.com",
  "hotnail.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmial.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "outloo.com": "outlook.com",
  "yaho.com": "yahoo.com",
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function getStorageValue(key) {
  if (!canUseStorage()) {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStorageValue(key, value) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore localStorage quota/privacy failures.
  }
}

export function normalizeEmail(value) {
  const rawValue = String(value ?? "");
  const compactValue = rawValue.replace(/\s+/g, "").trim();
  const atIndex = compactValue.lastIndexOf("@");

  if (atIndex === -1) {
    return compactValue;
  }

  const localPart = compactValue.slice(0, atIndex);
  const domain = compactValue.slice(atIndex + 1).toLowerCase();
  return `${localPart}@${domain}`;
}

export function validateEmail(value, options = {}) {
  const { required = false } = options;
  const email = normalizeEmail(value);

  if (!email) {
    return {
      email,
      isValid: !required,
      error: required ? "Ingresá tu email." : "",
      suggestion: "",
    };
  }

  if (email.length > MAX_EMAIL_LENGTH) {
    return {
      email,
      isValid: false,
      error: "El email es demasiado largo.",
      suggestion: "",
    };
  }

  if (!EMAIL_REGEX.test(email) || email.includes("..")) {
    return {
      email,
      isValid: false,
      error: "Ingresá un email válido.",
      suggestion: "",
    };
  }

  const [localPart, domain] = email.split("@");
  const labels = domain.split(".");
  const suggestion = DOMAIN_SUGGESTIONS[domain] ? `${localPart}@${DOMAIN_SUGGESTIONS[domain]}` : "";

  if (!localPart || !domain || labels.length < 2) {
    return {
      email,
      isValid: false,
      error: "Ingresá un email válido.",
      suggestion,
    };
  }

  if (
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    domain.startsWith(".") ||
    domain.endsWith(".")
  ) {
    return {
      email,
      isValid: false,
      error: "Ingresá un email válido.",
      suggestion,
    };
  }

  if (BLOCKED_DOMAINS.has(domain)) {
    return {
      email,
      isValid: false,
      error: "Ese dominio no sirve para recibir emails reales.",
      suggestion,
    };
  }

  const hasInvalidLabel = labels.some(
    (label) => !label || label.startsWith("-") || label.endsWith("-")
  );

  if (hasInvalidLabel || labels.at(-1).length < 2) {
    return {
      email,
      isValid: false,
      error: "Ingresá un email válido.",
      suggestion,
    };
  }

  return {
    email,
    isValid: true,
    error: "",
    suggestion,
  };
}

export function formatRetryAfter(seconds) {
  if (seconds <= 60) {
    return `${seconds}s`;
  }

  const minutes = Math.ceil(seconds / 60);
  return `${minutes} min`;
}

export function checkEmailActionGuard(flow, email, options = {}) {
  const cooldownSeconds = options.cooldownSeconds ?? DEFAULT_COOLDOWN_SECONDS;
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const normalizedEmail = normalizeEmail(email);
  const key = `${STORAGE_PREFIX}:${flow}:${normalizedEmail}`;
  const now = Date.now();

  const storedValue = getStorageValue(key);
  const storedState = storedValue
    ? JSON.parse(storedValue)
    : { attempts: [], cooldownUntil: 0 };

  const recentAttempts = storedState.attempts.filter((timestamp) => now - timestamp < windowMs);
  const cooldownRemainingSeconds = Math.max(
    0,
    Math.ceil((storedState.cooldownUntil - now) / 1000)
  );

  if (cooldownRemainingSeconds > 0) {
    return {
      allowed: false,
      retryAfterSeconds: cooldownRemainingSeconds,
      error: `Esperá ${formatRetryAfter(cooldownRemainingSeconds)} antes de volver a intentarlo.`,
    };
  }

  if (recentAttempts.length >= maxAttempts) {
    const oldestAttempt = recentAttempts[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - oldestAttempt)) / 1000));

    return {
      allowed: false,
      retryAfterSeconds,
      error: "Hiciste demasiados intentos seguidos. Probá otra vez en unos minutos.",
    };
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    error: "",
  };
}

export function registerEmailActionAttempt(flow, email, options = {}) {
  const cooldownSeconds = options.cooldownSeconds ?? DEFAULT_COOLDOWN_SECONDS;
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const normalizedEmail = normalizeEmail(email);
  const key = `${STORAGE_PREFIX}:${flow}:${normalizedEmail}`;
  const now = Date.now();
  const storedValue = getStorageValue(key);
  const storedState = storedValue
    ? JSON.parse(storedValue)
    : { attempts: [], cooldownUntil: 0 };

  const attempts = storedState.attempts.filter((timestamp) => now - timestamp < windowMs);
  attempts.push(now);

  setStorageValue(
    key,
    JSON.stringify({
      attempts,
      cooldownUntil: now + cooldownSeconds * 1000,
    })
  );
}

export function getAuthRedirectUrl(path) {
  const envUrl =
    path === "/auth/update-password"
      ? import.meta.env.VITE_PASSWORD_RESET_REDIRECT_URL
      : import.meta.env.VITE_AUTH_REDIRECT_URL;

  if (envUrl) {
    return envUrl;
  }

  return `${window.location.origin}${path}`;
}

export function mapAuthError(error, flow) {
  const message = String(error?.message ?? "").toLowerCase();

  if (!message) {
    return "No pudimos completar la acción. Reintentá.";
  }

  if (message.includes("invalid login credentials")) {
    return "Email o contraseña incorrectos.";
  }

  if (message.includes("email not confirmed")) {
    return "Tu email todavía no fue confirmado. Pedí un nuevo correo de confirmación.";
  }

  if (message.includes("user already registered")) {
    return "Ese email ya está registrado.";
  }

  if (message.includes("signup is disabled")) {
    return "El registro está deshabilitado en este entorno.";
  }

  if (message.includes("security purposes")) {
    return "Esperá un momento antes de volver a pedir otro email.";
  }

  if (message.includes("rate limit") || message.includes("too many requests")) {
    return "Hay demasiadas solicitudes en este momento. Probá nuevamente más tarde.";
  }

  if (flow === "magic-link" && message.includes("for this email")) {
    return "No pudimos enviar el magic link a ese email.";
  }

  return error.message || "No pudimos completar la acción. Reintentá.";
}

export function logAuthEmailEvent(eventName, payload = {}) {
  const timestamp = new Date().toISOString();

  console.info("[auth-email]", {
    event: eventName,
    timestamp,
    ...payload,
  });
}
