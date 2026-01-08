import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { validateImageFile } from '@/lib/storage';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  maxFiles: number;
  maxSizeMB: number;
  onFilesChange: (files: File[]) => void;
  existingUrls?: string[];
  className?: string;
}

export function ImageUpload({
  maxFiles,
  maxSizeMB,
  onFilesChange,
  existingUrls = [],
  className,
}: ImageUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>(existingUrls);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles = Array.from(selectedFiles);

    // Check total count
    if (files.length + newFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} images allowed`);
      return;
    }

    // Validate each file
    const validFiles: File[] = [];
    for (const file of newFiles) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        toast.error(validation.error || 'Invalid file');
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Add new files
    const updatedFiles = [...files, ...validFiles];
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);

    // Create previews
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setFiles(newFiles);
    setPreviews(newPreviews);
    onFilesChange(newFiles);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Preview Grid */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {previews.map((preview, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-lg overflow-hidden border border-border group"
            >
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => removeFile(index)}
                className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white rounded-full shadow-card opacity-0 group-hover:opacity-100 transition-opacity"
                type="button"
              >
                <X size={14} className="text-destructive" />
              </button>
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded text-xs text-white">
                {index + 1}/{maxFiles}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Area */}
      {files.length < maxFiles && (
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors',
            isDragging
              ? 'border-forest bg-forest/5'
              : 'border-border hover:border-forest/50 hover:bg-accent/50'
          )}
        >
          {previews.length === 0 ? (
            <ImageIcon className="w-12 h-12 text-muted-foreground mb-4" />
          ) : (
            <Upload className="w-8 h-8 text-muted-foreground mb-2" />
          )}
          <p className="text-sm font-medium text-foreground mb-1">
            {isDragging ? 'Drop images here' : 'Click to upload or drag and drop'}
          </p>
          <p className="text-xs text-muted-foreground">
            Max {maxFiles} images, {maxSizeMB}MB each
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            JPEG, PNG, or WebP
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => handleFileChange(e.target.files)}
            className="hidden"
          />
        </div>
      )}

      {/* File count indicator */}
      {files.length > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {files.length} of {maxFiles} images selected
          </span>
          {files.length === maxFiles && (
            <span className="text-xs text-amber-600">Maximum reached</span>
          )}
        </div>
      )}
    </div>
  );
}
