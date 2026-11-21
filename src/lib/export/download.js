"use client";

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  // Give the browser a tick to start the download before releasing the URL.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// The CSV string already carries its UTF-8 BOM from toCSV(); do not add one here.
export function downloadCSV(filename, csvString) {
  downloadBlob(
    filename,
    new Blob([csvString], {
      type: "text/csv;charset=utf-8;",
    })
  );
}
