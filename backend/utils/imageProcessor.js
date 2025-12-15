import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

/**
 * Process and optimize image using sharp
 * @param {string} inputPath - Path to original image
 * @param {string} outputPath - Path to save processed image
 * @param {object} options - Processing options
 * @returns {Promise<object>} - Image metadata
 */
export async function processImage(inputPath, outputPath, options = {}) {
  const {
    width = 800,
    height = 800,
    quality = 85,
    format = "jpeg",
    fit = "inside", // 'cover', 'contain', 'fill', 'inside', 'outside'
  } = options;

  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();

    // Process image
    let processed = image
      .resize(width, height, {
        fit: fit,
        withoutEnlargement: true, // Don't upscale smaller images
      })
      .rotate(); // Auto-rotate based on EXIF

    // Apply format-specific processing
    if (format === "jpeg" || format === "jpg") {
      processed = processed.jpeg({
        quality: quality,
        progressive: true,
        mozjpeg: true,
      });
    } else if (format === "png") {
      processed = processed.png({
        quality: quality,
        compressionLevel: 9,
      });
    } else if (format === "webp") {
      processed = processed.webp({
        quality: quality,
      });
    }

    // Save processed image
    await processed.toFile(outputPath);

    // Get output file stats
    const stats = await fs.stat(outputPath);

    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: stats.size,
      processedFormat: format,
    };
  } catch (error) {
    console.error("Image processing error:", error);
    throw error;
  }
}

/**
 * Create thumbnail from image
 * @param {string} inputPath - Path to original image
 * @param {string} outputPath - Path to save thumbnail
 * @param {number} size - Thumbnail size (width & height)
 * @returns {Promise<void>}
 */
export async function createThumbnail(inputPath, outputPath, size = 200) {
  try {
    await sharp(inputPath)
      .resize(size, size, {
        fit: "cover",
        position: "center",
      })
      .jpeg({
        quality: 80,
        progressive: true,
      })
      .toFile(outputPath);
  } catch (error) {
    console.error("Thumbnail creation error:", error);
    throw error;
  }
}

/**
 * Delete image file
 * @param {string} filePath - Path to image file
 * @returns {Promise<void>}
 */
export async function deleteImage(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // Ignore if file doesn't exist
    if (error.code !== "ENOENT") {
      console.error("Image deletion error:", error);
      throw error;
    }
  }
}

/**
 * Get image dimensions
 * @param {string} filePath - Path to image
 * @returns {Promise<object>} - Width and height
 */
export async function getImageDimensions(filePath) {
  try {
    const metadata = await sharp(filePath).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
    };
  } catch (error) {
    console.error("Get dimensions error:", error);
    throw error;
  }
}
