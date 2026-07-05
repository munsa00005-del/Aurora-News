"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { gradientFor } from "@/lib/utils";

interface SafeImageProps {
  src: string | null | undefined;
  alt: string;
  fallbackKey: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  className?: string;
}

function usableImageUrl(src: string | null | undefined): src is string {
  if (!src) return false;
  try {
    const url = new URL(src);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function SafeImage({
  src,
  alt,
  fallbackKey,
  fill = false,
  priority = false,
  sizes,
  className,
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);
  const showImage = usableImageUrl(src) && !failed;

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!showImage) {
    return (
      <div
        aria-label={alt}
        className="h-full w-full"
        role="img"
        style={{ background: gradientFor(fallbackKey) }}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      priority={priority}
      sizes={sizes}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
