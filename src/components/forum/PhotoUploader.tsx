import { useRef, useState } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { uploadForumMedia, validateForumImage } from '@/lib/forum';
import { toast } from 'sonner';

export interface PhotoItem {
  url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  caption: string;
  uploading?: boolean;
}

interface PhotoUploaderProps {
  photos: PhotoItem[];
  onPhotosChange: (photos: PhotoItem[]) => void;
  userId: string;
  maxPhotos?: number;
}

export function PhotoUploader({ photos, onPhotosChange, userId, maxPhotos = 10 }: PhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCount, setUploadingCount] = useState(0);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remaining = maxPhotos - photos.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${maxPhotos} photos allowed`);
      return;
    }

    const filesToUpload = files.slice(0, remaining);
    if (files.length > remaining) {
      toast.info(`Only ${remaining} more photo${remaining === 1 ? '' : 's'} can be added`);
    }

    // Validate all files first
    const validFiles: File[] = [];
    for (const file of filesToUpload) {
      const error = validateForumImage(file);
      if (error) {
        toast.error(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) return;

    // Add placeholder items while uploading
    const placeholders: PhotoItem[] = validFiles.map((f) => ({
      url: URL.createObjectURL(f),
      file_name: f.name,
      file_type: f.type,
      file_size: f.size,
      caption: '',
      uploading: true,
    }));

    const updatedPhotos = [...photos, ...placeholders];
    onPhotosChange(updatedPhotos);
    setUploadingCount((c) => c + validFiles.length);

    // Upload each file
    const results = await Promise.allSettled(
      validFiles.map((file) => uploadForumMedia(file, userId))
    );

    // Replace placeholders with real URLs or remove failed ones
    const newPhotos = [...photos];
    let failCount = 0;

    results.forEach((result, i) => {
      if (result.status === 'fulfilled' && result.value) {
        newPhotos.push({
          url: result.value.url,
          file_name: result.value.name,
          file_type: result.value.type,
          file_size: result.value.size,
          caption: '',
        });
      } else {
        failCount++;
      }
      // Revoke object URL
      URL.revokeObjectURL(placeholders[i].url);
    });

    if (failCount > 0) {
      toast.error(`${failCount} photo${failCount === 1 ? '' : 's'} failed to upload`);
    }

    onPhotosChange(newPhotos);
    setUploadingCount(0);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    onPhotosChange(updated);
  };

  const updateCaption = (index: number, caption: string) => {
    const updated = photos.map((p, i) => (i === index ? { ...p, caption } : p));
    onPhotosChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => fileInputRef.current?.click()}
          disabled={photos.length >= maxPhotos || uploadingCount > 0}
        >
          {uploadingCount > 0 ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Camera size={14} />
          )}
          {uploadingCount > 0 ? 'Uploading...' : 'Add Photos'}
        </Button>
        <span className="text-xs text-muted-foreground">
          {photos.filter((p) => !p.uploading).length}/{maxPhotos} photos
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {photos.map((photo, index) => (
            <div key={`${photo.url}-${index}`} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                <img
                  src={photo.url}
                  alt={photo.file_name}
                  className="w-full h-full object-cover"
                />
                {photo.uploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg">
                    <Loader2 size={24} className="text-white animate-spin" />
                  </div>
                )}
              </div>
              {!photo.uploading && (
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              )}
              {!photo.uploading && (
                <Input
                  value={photo.caption}
                  onChange={(e) => updateCaption(index, e.target.value)}
                  placeholder="Caption (optional)"
                  className="mt-1.5 text-xs h-7"
                  maxLength={200}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
