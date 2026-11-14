import { Upload } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import UploadDialog from "./upload-dialog.tsx";

/** Banner that opens the upload wizard. */
export default function UploadZone({ onUpload }: { onUpload: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="upload-zone">
      <div>
        <b>Upload a new call recording</b>
        <small>MP3, WAV or M4A, reviewed against your compliance checklist</small>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" size="lg" onClick={() => setOpen(true)}>
            <Upload aria-hidden="true" />
            Upload call
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Upload a recording. In step 2 you can add checklist questions one by one, or in bulk from
          a CSV.
        </TooltipContent>
      </Tooltip>
      <UploadDialog open={open} onOpenChange={setOpen} onUploaded={onUpload} />
    </div>
  );
}
