import { useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { FileText, UploadCloud } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { cn } from "../../../lib/utils";
import { getApiErrorMessage } from "../../../lib/api-errors";
import { useUploadResume } from "../hooks";
import { CARD_CLASS } from "../theme";

const ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx"];
const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_BYTES = 5 * 1024 * 1024;

function isAcceptedFile(file: File): boolean {
  const hasAcceptedExtension = ACCEPTED_EXTENSIONS.some((ext) =>
    file.name.toLowerCase().endsWith(ext),
  );
  return hasAcceptedExtension || ACCEPTED_MIME_TYPES.includes(file.type);
}

function resumeFileName(resumeUrl: string): string {
  try {
    return decodeURIComponent(resumeUrl.split("/").pop() ?? "resume");
  } catch {
    return "resume";
  }
}

interface ResumeCardProps {
  profileExists: boolean;
  resumeUrl?: string | null;
}

export function ResumeCard({ profileExists, resumeUrl }: ResumeCardProps) {
  const uploadResume = useUploadResume();
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!isAcceptedFile(file)) {
      toast.error("Only PDF and Word documents (.pdf, .doc, .docx) are allowed.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("File is too large — the limit is 5MB.");
      return;
    }

    try {
      await uploadResume.mutateAsync(file);
      toast.success("Resume uploaded");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't upload your resume."));
    } finally {
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  return (
    <Card className={CARD_CLASS}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <FileText className="h-5 w-5 text-indigo-600" aria-hidden="true" />
          Resume
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!profileExists ? (
          <p className="text-sm text-muted-foreground">
            Set up your profile above before uploading a resume.
          </p>
        ) : (
          <>
            {resumeUrl && (
              <a
                href={resumeUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-md border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
              >
                <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{resumeFileName(resumeUrl)}</span>
              </a>
            )}

            <div
              role="button"
              tabIndex={0}
              aria-label="Upload resume: click to browse, or drag and drop a PDF or Word document, 5MB maximum"
              onClick={() => inputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2",
                isDragging
                  ? "border-indigo-400 bg-indigo-50"
                  : "border-stone-300 bg-stone-50/60 hover:bg-stone-100",
                uploadResume.isPending && "pointer-events-none opacity-60",
              )}
            >
              <UploadCloud className="h-8 w-8 text-indigo-500" aria-hidden="true" />
              <p className="text-sm font-medium">
                {uploadResume.isPending
                  ? "Uploading..."
                  : "Drag and drop your resume, or click to browse"}
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, DOC, or DOCX — up to 5MB
              </p>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="sr-only"
                disabled={uploadResume.isPending}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
            </div>

            {resumeUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={uploadResume.isPending}
              >
                Replace resume
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
