export const uploadImages = async (images, folderName) => {
    let uploadedImages = [];
    try {
      if (images.length > 0) {
        uploadedImages = await Promise.all(
          images.map(async file => {
            const imageFormData = new FormData();
            imageFormData.append('file', file);
            imageFormData.append('folder', folderName);
            const response = await fetch('/api/uploadimageProduct', {
              method: 'POST',
              body: imageFormData,
            });

            if (!response.ok) {
              throw new Error('Error uploading image');
            }
            const data = await response.json();
            return data.url;
          })
        );
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
    return uploadedImages;
  };
  
