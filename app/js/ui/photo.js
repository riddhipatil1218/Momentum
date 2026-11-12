// photo.js
// Shrinks a photo before it's sent to Claude: at most 1,280 px on the long side, as JPEG.
// Smaller photos upload faster and cost less, and are still sharp enough to read a label.

const MAX_SIDE = 1280;

/** @returns {Promise<{ mediaType: 'image/jpeg', data: string, previewUrl: string }>} */
export async function preparePhoto(file) {
  const bitmap = await loadImage(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const previewUrl = canvas.toDataURL('image/jpeg', 0.82);
  return { mediaType: 'image/jpeg', data: previewUrl.split(',')[1], previewUrl };
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That photo couldn’t be opened.')); };
    img.src = url;
  });
}
