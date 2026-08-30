import JSZip from 'jszip';
import { ProcessedItem } from './types';
import { getOriginalFileBlob } from './storageManager';

/**
 * Renders an image onto a full natural resolution canvas with high-quality bicubic smoothing
 * and applies any active horizon leveling and Lightroom tone curve adjustments.
 */
async function renderFullResolutionBlob(item: ProcessedItem): Promise<Blob> {
  // 1. Try to get the original full-resolution file blob
  let sourceBlob = await getOriginalFileBlob(item.metadata.id);
  if (!sourceBlob && item.originalFile) {
    sourceBlob = item.originalFile;
  }

  let sourceUrl = item.originalFileUrl || item.thumbnailUrl;
  let isCreatedUrl = false;
  if (sourceBlob) {
    sourceUrl = URL.createObjectURL(sourceBlob);
    isCreatedUrl = true;
  }

  // 2. Load the source image into an HTMLImageElement
  const img = new Image();
  img.crossOrigin = 'anonymous';

  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image for full-res export'));
      img.src = sourceUrl;
    });
  } finally {
    if (isCreatedUrl) {
      URL.revokeObjectURL(sourceUrl);
    }
  }

  const origWidth = img.naturalWidth || item.metadata.dimensions.width || 1920;
  const origHeight = img.naturalHeight || item.metadata.dimensions.height || 1080;

  // 3. Create full-resolution canvas matching exact original resolution
  const canvas = document.createElement('canvas');
  canvas.width = origWidth;
  canvas.height = origHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    if (sourceBlob) return sourceBlob;
    const resp = await fetch(sourceUrl);
    return await resp.blob();
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Apply CSS tone filter (Lightroom under/over exposed tone adjustments)
  if (item.lightroom && item.lightroom.cssFilter && item.lightroom.cssFilter !== 'none') {
    ctx.filter = item.lightroom.cssFilter;
  }

  // Apply Horizon Straightening rotation & inscribed crop if required
  if (item.geometry && item.geometry.requiresCorrection && item.geometry.correctedAngleDeg !== 0) {
    const crop = item.geometry.cropBox;
    const scale =
      crop && crop.width > 0 && crop.height > 0
        ? Math.max(origWidth / crop.width, origHeight / crop.height)
        : 1.0;

    ctx.save();
    ctx.translate(origWidth / 2, origHeight / 2);
    ctx.rotate((item.geometry.correctedAngleDeg * Math.PI) / 180);
    ctx.drawImage(
      img,
      (-origWidth * scale) / 2,
      (-origHeight * scale) / 2,
      origWidth * scale,
      origHeight * scale
    );
    ctx.restore();
  } else {
    ctx.drawImage(img, 0, 0, origWidth, origHeight);
  }

  // Export full resolution JPEG blob at 98% quality
  return new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else if (sourceBlob) {
          resolve(sourceBlob);
        } else {
          fetch(sourceUrl).then((r) => r.blob()).then(resolve);
        }
      },
      'image/jpeg',
      0.98
    );
  });
}

/**
 * Downloads a single photo in FULL original resolution.
 */
export async function downloadSingleImage(item: ProcessedItem) {
  try {
    const fullBlob = await renderFullResolutionBlob(item);
    const downloadUrl = URL.createObjectURL(fullBlob);

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = item.metadata.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
  } catch {
    // Direct fallback
    const fallbackUrl = item.originalFileUrl || item.thumbnailUrl;
    const a = document.createElement('a');
    a.href = fallbackUrl;
    a.download = item.metadata.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

/**
 * Packages all enhanced photos and separated _archive photos into a ZIP folder hierarchy
 * in 100% full original resolution and initiates download.
 */
export async function downloadOrganizedFolderZip(
  items: ProcessedItem[],
  folderName: string = 'LuminaSort_Organized_Photos',
  onProgress?: (percent: number) => void
): Promise<void> {
  if (items.length === 0) return;

  const zip = new JSZip();
  const rootFolder = zip.folder(folderName) || zip;
  const enhancedFolder = rootFolder.folder('Enhanced') || rootFolder;
  const archiveFolder = rootFolder.folder('_archive') || rootFolder;

  // Generate Organization Manifest
  const kept = items.filter((i) => !i.isArchived);
  const archived = items.filter((i) => i.isArchived);

  let manifestText = `====================================================\n`;
  manifestText += `  LuminaSort — Intelligent Photo Organization Report\n`;
  manifestText += `  Export Mode: Full Resolution Master Files\n`;
  manifestText += `  Generated: ${new Date().toLocaleString()}\n`;
  manifestText += `====================================================\n\n`;
  manifestText += `TOTAL PROCESSED: ${items.length} photos\n`;
  manifestText += `ENHANCED (KEPT): ${kept.length} photos\n`;
  manifestText += `SEPARATED (_ARCHIVE): ${archived.length} photos\n\n`;

  manifestText += `----------------------------------------------------\n`;
  manifestText += `  ENHANCED PHOTOS (Full Resolution + Leveled + Lightroom Tone)\n`;
  manifestText += `----------------------------------------------------\n`;
  kept.forEach((item, idx) => {
    manifestText += `${idx + 1}. ${item.metadata.filename}\n`;
    manifestText += `   - Original Resolution: ${item.metadata.dimensions.width}x${item.metadata.dimensions.height} px\n`;
    manifestText += `   - Size: ${(item.metadata.fileSize / 1000000).toFixed(2)} MB\n`;
    manifestText += `   - Sharpness: ${item.quality.laplacianSharpness.toFixed(1)} / 100\n`;
    manifestText += `   - Lightroom Adjustments: ${item.lightroom.appliedToneDescription}\n`;
    manifestText += `   - Output Path: Enhanced/${item.metadata.filename}\n\n`;
  });

  if (archived.length > 0) {
    manifestText += `----------------------------------------------------\n`;
    manifestText += `  SEPARATED _ARCHIVE PHOTOS (Defocus Blur / Motion Shake)\n`;
    manifestText += `----------------------------------------------------\n`;
    archived.forEach((item, idx) => {
      manifestText += `${idx + 1}. ${item.metadata.filename}\n`;
      manifestText += `   - Original Resolution: ${item.metadata.dimensions.width}x${item.metadata.dimensions.height} px\n`;
      manifestText += `   - Size: ${(item.metadata.fileSize / 1000000).toFixed(2)} MB\n`;
      manifestText += `   - Reason: ${item.blurClassification.reason}\n`;
      manifestText += `   - Output Path: _archive/${item.metadata.filename}\n\n`;
    });
  }

  rootFolder.file('README_ORGANIZATION.txt', manifestText);

  // Render & Add each image at 100% full original resolution
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      const fullBlob = await renderFullResolutionBlob(item);
      const targetSubfolder = item.isArchived ? archiveFolder : enhancedFolder;
      targetSubfolder.file(item.metadata.filename, fullBlob);
    } catch {
      // Fallback
      try {
        const fallbackUrl = item.originalFileUrl || item.thumbnailUrl;
        const res = await fetch(fallbackUrl);
        const fallbackBlob = await res.blob();
        const targetSubfolder = item.isArchived ? archiveFolder : enhancedFolder;
        targetSubfolder.file(item.metadata.filename, fallbackBlob);
      } catch {
        // Fallback text entry
      }
    }

    if (onProgress) {
      onProgress(Math.round(((i + 1) / items.length) * 60));
    }
  }

  // Generate ZIP blob with progress callback
  const zipBlob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
    (metadata) => {
      if (onProgress) {
        onProgress(60 + Math.round(metadata.percent * 0.4));
      }
    }
  );

  // Trigger browser download
  const downloadUrl = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `${folderName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
}
