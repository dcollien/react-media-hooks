import { useEffect, useState } from "react";

// Helper function to trigger downloads of blobs as files
export function downloadBlobs(blobs: Blob[], filePrefix = "recording") {
  if (blobs.length === 0) return;

  const temporaryElements: Array<HTMLAnchorElement> = [];
  const temporaryUrls: Array<string> = [];

  for (let i = 0; i < blobs.length; i++) {
    const blob = blobs[i];
    const url = URL.createObjectURL(blob);

    // Download the audio file
    const mime = blob.type;
    const ext = mime.split("/")[1].split(";")[0];
    const filename = `${filePrefix}.${ext}`;

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();

    temporaryElements.push(a);
    temporaryUrls.push(url);
  }

  setTimeout(() => {
    temporaryElements.forEach((a) => document.body.removeChild(a));
    temporaryUrls.forEach((url) => URL.revokeObjectURL(url));
  }, 100);
}

// Helper function to create URLs from blobs
// and revoke them when the component unmounts or blobs invalidate.
// This only updates when the blobs array changes.
export function useBlobUrls(blobs: Blob[]) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    setUrls(blobs.map((blob) => URL.createObjectURL(blob)));

    return () => {
      // Needs to be an effect so it can clean up
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blobs, blobs.length]);

  return urls;
}
