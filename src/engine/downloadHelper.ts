import JSZip from 'jszip';
import { ProcessedItem } from './types';

/**
 * Downloads a single image to the user's computer.
 */
export async function downloadSingleImage(item: ProcessedItem) {
  try {
    const response = await fetch(item.thumbnailUrl);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = item.metadata.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
  } catch {
    // Direct link fallback
    const a = document.createElement('a');
    a.href = item.thumbnailUrl;
    a.download = item.metadata.filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

/**
 * Packages all enhanced photos and separated _archive photos into a ZIP folder hierarchy and initiates download.
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

  // Generate Organization Report
  const kept = items.filter((i) => !i.isArchived);
  const archived = items.filter((i) => i.isArchived);

  let manifestText = `====================================================\n`;
  manifestText += `  LuminaSort — Intelligent Photo Organization Report\n`;
  manifestText += `  Generated: ${new Date().toLocaleString()}\n`;
  manifestText += `====================================================\n\n`;
  manifestText += `TOTAL PROCESSED: ${items.length} photos\n`;
  manifestText += `ENHANCED (KEPT): ${kept.length} photos\n`;
  manifestText += `SEPARATED (_ARCHIVE): ${archived.length} photos\n\n`;

  manifestText += `----------------------------------------------------\n`;
  manifestText += `  ENHANCED PHOTOS LIST (Horizon Leveled + Lightroom Tone)\n`;
  manifestText += `----------------------------------------------------\n`;
  kept.forEach((item, idx) => {
    manifestText += `${idx + 1}. ${item.metadata.filename}\n`;
    manifestText += `   - Dimensions: ${item.metadata.dimensions.width}x${item.metadata.dimensions.height} px\n`;
    manifestText += `   - Size: ${(item.metadata.fileSize / 1000000).toFixed(2)} MB\n`;
    manifestText += `   - Sharpness: ${item.quality.laplacianSharpness.toFixed(1)} / 100\n`;
    manifestText += `   - Lightroom Tone: ${item.lightroom.appliedToneDescription}\n`;
    manifestText += `   - Target: Enhanced/${item.metadata.filename}\n\n`;
  });

  if (archived.length > 0) {
    manifestText += `----------------------------------------------------\n`;
    manifestText += `  SEPARATED _ARCHIVE PHOTOS LIST (Blur / Motion Shake)\n`;
    manifestText += `----------------------------------------------------\n`;
    archived.forEach((item, idx) => {
      manifestText += `${idx + 1}. ${item.metadata.filename}\n`;
      manifestText += `   - Size: ${(item.metadata.fileSize / 1000000).toFixed(2)} MB\n`;
      manifestText += `   - Separation Reason: ${item.blurClassification.reason}\n`;
      manifestText += `   - Target: _archive/${item.metadata.filename}\n\n`;
    });
  }

  rootFolder.file('README_ORGANIZATION.txt', manifestText);

  // Add real image blobs into zip
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      const response = await fetch(item.thumbnailUrl);
      const blob = await response.blob();
      const targetSubfolder = item.isArchived ? archiveFolder : enhancedFolder;
      targetSubfolder.file(item.metadata.filename, blob);
    } catch {
      // Fallback text entry if fetch fails
      const targetSubfolder = item.isArchived ? archiveFolder : enhancedFolder;
      targetSubfolder.file(`${item.metadata.filename}.info.txt`, `File: ${item.metadata.filename} (${item.metadata.fileSize} bytes)`);
    }

    if (onProgress) {
      onProgress(Math.round(((i + 1) / items.length) * 50));
    }
  }

  // Generate ZIP blob with progress callback
  const zipBlob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
    (metadata) => {
      if (onProgress) {
        onProgress(50 + Math.round(metadata.percent * 0.5));
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
