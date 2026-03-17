// Client-side image upload utility
// This runs in the browser, not on the server

export type UploadImageResponse = {
  image_url: string;
  thumb_url: string;
};

export async function uploadImageNative(imageFile: File): Promise<{
  success: boolean;
  imageUrl?: string;
  error?: string;
}> {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await fetch('/api/design/upload-image', {
      method: 'POST',
      body: formData,
    });

    const responseData = await response.json().catch(() => null) as UploadImageResponse | { error?: string } | null;

    if (!response.ok) {
      const errorMessage = responseData && 'error' in responseData && responseData.error
        ? responseData.error
        : `Upload failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    const data = responseData as UploadImageResponse | null;

    if (!data || !data.image_url) {
      throw new Error('API yanıtında image_url bulunamadı');
    }

    return {
      success: true,
      imageUrl: data.image_url,
    };
  } catch (error) {
    console.error('Image upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Görsel yüklenemedi',
    };
  }
}
