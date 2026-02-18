import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { ForumPostMedia } from '@/lib/forum';
import { cn } from '@/lib/utils';

interface PhotoGalleryProps {
  photos: ForumPostMedia[];
}

export function PhotoGallery({ photos }: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  const goNext = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex + 1) % photos.length);
  }, [lightboxIndex, photos.length]);

  const goPrev = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex - 1 + photos.length) % photos.length);
  }, [lightboxIndex, photos.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
    };

    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [lightboxIndex, goNext, goPrev]);

  if (photos.length === 0) return null;

  const gridClass =
    photos.length === 1
      ? 'grid-cols-1'
      : photos.length === 2
      ? 'grid-cols-2'
      : 'grid-cols-2 md:grid-cols-3';

  return (
    <>
      <div className={cn('grid gap-2 mb-4', gridClass)}>
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className={cn(
              'relative rounded-lg overflow-hidden cursor-pointer group',
              photos.length === 1 ? 'max-h-96' : 'aspect-square'
            )}
            onClick={() => openLightbox(index)}
          >
            <img
              src={photo.file_url}
              alt={photo.caption || photo.file_name}
              className={cn(
                'w-full object-cover transition-transform group-hover:scale-105',
                photos.length === 1 ? 'max-h-96' : 'h-full'
              )}
            />
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white z-10"
            onClick={closeLightbox}
          >
            <X size={28} />
          </button>

          {/* Navigation arrows */}
          {photos.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white z-10 bg-black/30 rounded-full p-2"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
              >
                <ChevronLeft size={28} />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white z-10 bg-black/30 rounded-full p-2"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
              >
                <ChevronRight size={28} />
              </button>
            </>
          )}

          {/* Image */}
          <div
            className="flex flex-col items-center max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={photos[lightboxIndex].file_url}
              alt={photos[lightboxIndex].caption || photos[lightboxIndex].file_name}
              className="max-w-[90vw] max-h-[80vh] object-contain rounded"
            />
            <div className="mt-3 text-center">
              {photos[lightboxIndex].caption && (
                <p className="text-white/90 text-sm mb-1">
                  {photos[lightboxIndex].caption}
                </p>
              )}
              {photos.length > 1 && (
                <p className="text-white/50 text-xs">
                  {lightboxIndex + 1} of {photos.length}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
