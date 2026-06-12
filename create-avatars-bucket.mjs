import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAvatarsBucket() {
  console.log('\n🪣 Creating avatars storage bucket...\n');

  try {
    // Create the bucket
    const { data: bucket, error: bucketError } = await supabase.storage.createBucket('avatars', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
    });

    if (bucketError) {
      if (bucketError.message.includes('already exists')) {
        console.log('✅ Bucket already exists');
      } else {
        throw bucketError;
      }
    } else {
      console.log('✅ Bucket created successfully');
    }

    console.log('\n📋 Setting up storage policies...\n');

    // Note: Policies need to be set up via Supabase SQL or Dashboard
    // Here's the SQL you need to run:
    console.log('Run this SQL in Supabase SQL Editor:\n');
    console.log(`
-- Allow users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access (avatars are public)
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
    `);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createAvatarsBucket();
