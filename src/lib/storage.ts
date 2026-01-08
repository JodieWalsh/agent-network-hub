// Supabase Storage utilities for property images and floor plans
import { supabase } from '@/integrations/supabase/client';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FLOOR_PLAN_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_FLOOR_PLAN_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

interface UploadResult {
  url: string;
  path: string;
}

/**
 * Upload a property image to Supabase Storage
 * @param file - Image file to upload
 * @param userId - User ID (for folder structure)
 * @param propertyId - Property ID (for folder structure)
 * @param index - Image index (for filename)
 * @returns Object with public URL and storage path
 */
export async function uploadPropertyImage(
  file: File,
  userId: string,
  propertyId: string,
  index: number
): Promise<UploadResult> {
  // Validate file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Please upload JPEG, PNG, or WebP images.');
  }

  // Validate file size
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(`Image size exceeds 5MB limit. File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
  }

  // Generate path: {user_id}/{property_id}/image-{index}.{ext}
  const extension = getFileExtension(file.type);
  const path = `${userId}/${propertyId}/image-${index}.${extension}`;

  // Upload to storage
  const { data, error } = await supabase.storage
    .from('property-images')
    .upload(path, file, { upsert: true });

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('property-images')
    .getPublicUrl(path);

  return { url: publicUrl, path: data.path };
}

/**
 * Upload a floor plan to Supabase Storage
 * @param file - Floor plan file (PDF or image)
 * @param userId - User ID (for folder structure)
 * @param propertyId - Property ID (for folder structure)
 * @returns Object with public URL and storage path
 */
export async function uploadFloorPlan(
  file: File,
  userId: string,
  propertyId: string
): Promise<UploadResult> {
  // Validate file type
  if (!ALLOWED_FLOOR_PLAN_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Please upload PDF, JPEG, or PNG files.');
  }

  // Validate file size
  if (file.size > MAX_FLOOR_PLAN_SIZE) {
    throw new Error(`Floor plan size exceeds 10MB limit. File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
  }

  // Generate path: {user_id}/{property_id}/floor-plan.{ext}
  const extension = file.type === 'application/pdf' ? 'pdf' : getFileExtension(file.type);
  const path = `${userId}/${propertyId}/floor-plan.${extension}`;

  // Upload to storage
  const { data, error } = await supabase.storage
    .from('floor-plans')
    .upload(path, file, { upsert: true });

  if (error) {
    throw new Error(`Failed to upload floor plan: ${error.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('floor-plans')
    .getPublicUrl(path);

  return { url: publicUrl, path: data.path };
}

/**
 * Delete property images from storage
 * @param paths - Array of storage paths to delete
 */
export async function deletePropertyImages(paths: string[]): Promise<void> {
  const { error } = await supabase.storage
    .from('property-images')
    .remove(paths);

  if (error) {
    throw new Error(`Failed to delete images: ${error.message}`);
  }
}

/**
 * Delete floor plan from storage
 * @param path - Storage path to delete
 */
export async function deleteFloorPlan(path: string): Promise<void> {
  const { error } = await supabase.storage
    .from('floor-plans')
    .remove([path]);

  if (error) {
    throw new Error(`Failed to delete floor plan: ${error.message}`);
  }
}

/**
 * Get file extension from MIME type
 */
function getFileExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  return map[mimeType] || 'jpg';
}

/**
 * Validate image file before upload (client-side check)
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload JPEG, PNG, or WebP images.',
    };
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return {
      valid: false,
      error: `Image size exceeds 5MB limit. File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  return { valid: true };
}

/**
 * Validate floor plan file before upload (client-side check)
 */
export function validateFloorPlanFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_FLOOR_PLAN_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload PDF, JPEG, or PNG files.',
    };
  }

  if (file.size > MAX_FLOOR_PLAN_SIZE) {
    return {
      valid: false,
      error: `Floor plan size exceeds 10MB limit. File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  return { valid: true };
}
