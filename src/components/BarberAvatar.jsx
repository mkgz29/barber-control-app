import { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  AVATAR_BUCKET,
  getInitials,
  isExternalAvatarUrl,
  normalizeAvatarObjectPath,
} from "../lib/avatar";
import supabase from "../lib/supabaseClient";

const sizeClasses = {
  xs: "h-6 w-6 text-[0.65rem]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-24 w-24 text-2xl",
};

export default function BarberAvatar({ name, src, size = "md", className }) {
  const [resolvedSrc, setResolvedSrc] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const displayName = String(name || "Sin nombre").trim() || "Sin nombre";

  useEffect(() => {
    let cancelled = false;
    const normalizedSrc = normalizeAvatarObjectPath(src);

    setImageFailed(false);

    if (!normalizedSrc) {
      setResolvedSrc("");
      return () => {
        cancelled = true;
      };
    }

    if (isExternalAvatarUrl(normalizedSrc)) {
      setResolvedSrc(normalizedSrc);
      return () => {
        cancelled = true;
      };
    }

    async function resolvePrivateAvatar() {
      const { data, error } = await supabase.storage
        .from(AVATAR_BUCKET)
        .createSignedUrl(normalizedSrc, 60 * 60);

      if (!cancelled) {
        setResolvedSrc(error ? "" : data?.signedUrl || "");
      }
    }

    resolvePrivateAvatar();

    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <Avatar
      className={cn(
        "border border-slate-200 bg-slate-100 text-slate-700 ring-1 ring-white",
        sizeClasses[size] || sizeClasses.md,
        className
      )}
      title={displayName}
    >
      {resolvedSrc && !imageFailed && (
        <AvatarImage
          alt={displayName}
          src={resolvedSrc}
          onLoadingStatusChange={(status) => {
            if (status === "error") {
              setImageFailed(true);
            }
          }}
        />
      )}
      <AvatarFallback className="bg-slate-100 font-semibold text-slate-700">
        {getInitials(displayName)}
      </AvatarFallback>
    </Avatar>
  );
}
