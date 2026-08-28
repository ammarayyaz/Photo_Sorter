# LuminaSort — UI/UX Design Specification & Guidelines
**Document Version:** 3.4.0  
**Project:** LuminaSort (Intelligent Photo Organizer & Auto-Enhancement System)  
**Theme:** Persistent IndexedDB Storage Layer (Zero Data Loss on Page Refresh)  
**Status:** Implemented & Verified  

---

## 1. Persistent Storage Architecture (`storageManager.ts`)

1. **Browser IndexedDB Storage (`LuminaSortDB`)**:
   - Automatically records session state into IndexedDB:
     - All uploaded `ProcessedItem[]` images & metadata.
     - Persistent base64 canvas thumbnails.
     - Folder structures (`folders[]`).
     - Current pipeline metrics (`metrics`).
     - Active tab navigation state (`activeTab`).
     - Active folder and album names.

2. **Auto-Restore on Page Refresh**:
   - On full browser reload (`F5`), LuminaSort restores your uploaded folders, thumbnails, metrics, and active tab.

3. **Session Reset**:
   - Clicking the Reset icon button in the header clears the IndexedDB session and resets to fresh state.
