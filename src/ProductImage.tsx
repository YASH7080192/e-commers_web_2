import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';

export default function ProductImage({ src, alt, className, loading = 'lazy' }: {
  src?: string;
  alt: string;
  className?: string;
  loading?: 'eager' | 'lazy';
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (!src || failed) return <div className={`imagePlaceholder ${className || ''}`} role="img" aria-label={`${alt}: image unavailable`}>
    <ImageOff size={24}/><span>Product image unavailable</span>
  </div>;

  return <img className={className} src={src} alt={alt} loading={loading} onError={() => setFailed(true)}/>;
}
