# LuminaSort — UI/UX Design Specification & Guidelines
**Document Version:** 3.3.0  
**Project:** LuminaSort (Intelligent Photo Organizer & Auto-Enhancement System)  
**Theme:** Universal Format Support & Real Folder/File Ingestion  
**Status:** Implemented & Verified  

---

## 1. Supported File Formats & Folder Ingestion

1. **Standard Image Formats**:
   - `JPEG` / `JPG`
   - `PNG` (Transparent & Solid)
   - `WEBP`
   - `AVIF`
   - `HEIC` / `HEIF` (Apple iOS Live Photos & ProRAW)
   - `TIFF` / `TIF`
   - `BMP`
   - `GIF`
   - `SVG`

2. **Professional Camera RAW Formats**:
   - **Canon**: `.CR2`, `.CR3`
   - **Nikon**: `.NEF`, `.NRW`
   - **Sony**: `.ARW`, `.SRF`, `.SR2`
   - **Adobe / Apple ProRAW / Leica**: `.DNG`
   - **Fujifilm**: `.RAF`
   - **Olympus**: `.ORF`
   - **Panasonic**: `.RW2`
   - **Pentax**: `.PEF`, `.PTX`
   - **Generic Camera RAW**: `.RAW`

3. **Folder Ingestion**:
   - Supports selecting any folder from the computer (`webkitdirectory`), parsing all nested photos and maintaining directory names.
