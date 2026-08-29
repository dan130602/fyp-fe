import { useRef, useState } from "react";

/** Drag-and-drop target for a new call recording. Nothing is uploaded anywhere. */
export default function UploadZone({ onUpload }) {
  const input = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const useFile = (file) => { if (file) { setFileName(file.name); onUpload(file); } };
  return <div className={`upload-zone ${dragging ? "dragging" : ""}`} role="button" tabIndex="0" onClick={() => input.current?.click()} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); useFile(e.dataTransfer.files[0]); }}><div className="upload-icon">↑</div><div><b>Upload a new call recording</b><small className={fileName ? "uploaded" : ""}>{fileName ? `${fileName} · Ready to analyse` : "Drag and drop MP3, WAV, or M4A here, or choose a file"}</small></div><button type="button" onClick={(e) => { e.stopPropagation(); input.current?.click(); }}>Choose audio</button><input ref={input} type="file" accept="audio/mpeg,audio/wav,audio/x-wav,audio/mp4,.mp3,.wav,.m4a" onChange={(e) => useFile(e.target.files[0])}/></div>;
}
