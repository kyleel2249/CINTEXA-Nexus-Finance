import { useState, useCallback } from 'react';

interface Props {
  onTextReady: (filename: string, text: string) => void;
}

export function UploadPanel({ onTextReady }: Props) {
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      const file = files[0];
      setStatus(`Reading ${file.name}…`);
      try {
        if (file.type.startsWith('text/') || file.name.match(/\.(txt|csv|md)$/i)) {
          const text = await file.text();
          onTextReady(file.name, text);
          setStatus(`Loaded ${file.name} (${text.length} chars)`);
        } else if (file.name.match(/\.(json)$/i)) {
          const text = await file.text();
          onTextReady(file.name, text);
          setStatus(`Loaded ${file.name}`);
        } else {
          setStatus(
            `${file.name}: binary formats (PDF/XLSX/images) require server-side OCR/extraction. Use the structured demo or paste extracted text for now.`
          );
        }
      } catch (e: any) {
        setStatus(e.message || 'Upload failed');
      }
    },
    [onTextReady]
  );

  return (
    <div
      className={`rounded-2xl border-2 border-dashed p-8 text-center transition ${
        dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <p className="font-medium text-slate-800">Drop financial documents here</p>
      <p className="mt-1 text-sm text-slate-500">TXT / CSV supported client-side · PDF/XLSX via server OCR pipeline</p>
      <label className="mt-4 inline-block cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
        Choose file
        <input
          type="file"
          className="hidden"
          accept=".txt,.csv,.md,.json,.pdf,.xlsx,.xls,.docx"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
      {status && <p className="mt-3 text-xs text-slate-500">{status}</p>}
    </div>
  );
}
