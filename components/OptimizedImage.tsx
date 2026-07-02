import Image from "next/image";

type OptimizedImageProps = {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  loading?: "lazy" | "eager";
  fill?: boolean;
  draggable?: boolean;
  onError?: () => void;
};

function isOptimizable(src: string) {
  return (
    src.startsWith("/") ||
    src.includes(".public.blob.vercel-storage.com")
  );
}

function normalizeImageSrc(src: string) {
  if (!src.startsWith("/")) return src;
  const [path] = src.split("?");
  return path;
}

/** Use Next.js image optimization for local/static assets; plain img for other URLs. */
export default function OptimizedImage({
  src,
  alt,
  className,
  width,
  height,
  sizes,
  priority = false,
  loading,
  fill = false,
  draggable = false,
  onError,
}: OptimizedImageProps) {
  const hasQuery = src.includes("?");
  const optimizable = isOptimizable(src) && !hasQuery;
  const imageSrc = normalizeImageSrc(src);

  if (!optimizable) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={className}
        width={width}
        height={height}
        loading={priority ? "eager" : loading ?? "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : undefined}
        draggable={draggable}
        onError={onError}
      />
    );
  }

  if (fill) {
    return (
      <Image
        src={imageSrc}
        alt={alt}
        fill
        className={className}
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : loading ?? "lazy"}
        quality={85}
        draggable={draggable}
        onError={onError}
      />
    );
  }

  return (
    <Image
      src={imageSrc}
      alt={alt}
      width={width ?? 1}
      height={height ?? 1}
      className={className}
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : loading ?? "lazy"}
      quality={85}
      draggable={draggable}
      onError={onError}
    />
  );
}
