export const AVATAR_BUCKET = "avatars";
export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

export const AVATAR_ALLOWED_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function getInitials(name) {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "?";
  }

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

export function validateAvatarFile(file) {
  if (!file) {
    return "Selecciona una imagen.";
  }

  if (!AVATAR_ALLOWED_TYPES[file.type]) {
    return "Usa una imagen JPG, PNG o WEBP.";
  }

  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    return "La imagen no puede superar los 5 MB.";
  }

  return "";
}

export function getAvatarObjectPath(userId, file) {
  const extension = AVATAR_ALLOWED_TYPES[file?.type] || "jpg";
  return `${userId}/avatar-${Date.now()}.${extension}`;
}

export function normalizeAvatarObjectPath(value) {
  const rawValue = String(value || "").trim();

  if (!rawValue || rawValue.startsWith("http") || rawValue.startsWith("blob:")) {
    return rawValue;
  }

  return rawValue.replace(/^avatars\//, "").replace(/^\/+/, "");
}

export function isExternalAvatarUrl(value) {
  const rawValue = String(value || "").trim();

  return rawValue.startsWith("http") || rawValue.startsWith("blob:");
}
