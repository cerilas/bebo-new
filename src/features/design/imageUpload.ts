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
    // Create FormData
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await fetch('/api/design/upload-image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Upload error response:', errorText);
      throw new Error(`Upload failed with status ${response.status}: ${errorText}`);
    }

    const responseText = await response.text();
    console.log('Upload response:', responseText);

    // Try to parse as JSON
    let data: UploadImageResponse;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('Failed to parse response as JSON:', responseText);
      throw new Error('API yanıtı JSON formatında değil');
    }

    // Check if image_url exists
    if (!data.image_url) {
      console.error('Response data:', data);
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
