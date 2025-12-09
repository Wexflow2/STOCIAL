const sharp = require('sharp');

const optimizeImage = async (buffer, options = {}) => {
  const {
    width = 1200,
    height = null,
    quality = 80,
    format = 'webp'
  } = options;

  try {
    let pipeline = sharp(buffer);

    if (width || height) {
      pipeline = pipeline.resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    const outputBuffer = await pipeline
      .toFormat(format, { quality })
      .toBuffer();

    return outputBuffer;
  } catch (error) {
    console.error('Error optimizing image:', error);
    return buffer;
  }
};

const createThumbnail = async (buffer, size = 400) => {
  try {
    return await sharp(buffer)
      .resize(size, size, {
        fit: 'cover',
        position: 'center'
      })
      .toFormat('webp', { quality: 70 })
      .toBuffer();
  } catch (error) {
    console.error('Error creating thumbnail:', error);
    return buffer;
  }
};

module.exports = { optimizeImage, createThumbnail };
