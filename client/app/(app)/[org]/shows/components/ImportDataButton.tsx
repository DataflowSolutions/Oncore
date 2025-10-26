"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileSpreadsheet, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";

interface ImportDataButtonProps {
  orgId: string;
}

export default function ImportDataButton({ orgId }: ImportDataButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        "text/csv",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];
      if (validTypes.includes(selectedFile.type) || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError("Please upload a CSV or Excel file");
        setFile(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("orgId", orgId);

      const response = await fetch('/api/shows/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import data');
      }
      
      toast.success('Import Complete!', {
        description: data.message || `Imported ${data.imported} show(s)`,
      });

      if (data.errors && data.errors.length > 0) {
        toast.warning('Some rows had errors', {
          description: `${data.errors.length} row(s) failed to import`,
        });
      }

      setShowDialog(false);
      setFile(null);
      
      // Refresh the page to show new shows
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error("Error importing data:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to import data";
      setError(errorMessage);
      toast.error('Import Failed', {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (showDialog) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div
          role="dialog"
          className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg"
          tabIndex={-1}
        >
          <div className="flex items-center justify-between">
            <div className="flex flex-col space-y-1.5">
              <h2 className="font-semibold tracking-tight flex items-center gap-2 text-xl">
                <FileSpreadsheet className="h-5 w-5" />
                Import Show Data
              </h2>
              <p className="text-sm text-muted-foreground">
                Upload a CSV or Excel file with show information
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDialog(false)}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {error && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">File Upload</label>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <Input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  disabled={isLoading}
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <div className="text-sm">
                    {file ? (
                      <span className="text-primary font-medium">{file.name}</span>
                    ) : (
                      <>
                        <span className="text-primary font-medium">Click to upload</span>
                        <span className="text-muted-foreground"> or drag and drop</span>
                      </>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    CSV or Excel (MAX. 10MB)
                  </span>
                </label>
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="text-sm font-semibold">Expected Format:</h4>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Show Name, Date, Venue, City, Artist</li>
                <li>Performance Time, Show Type</li>
                <li>Optional: Notes, Crew Requirements</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !file}>
                {isLoading ? "Importing..." : "Import Data"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <Button
      onClick={() => setShowDialog(true)}
      size="lg"
      variant="outline"
      type="button"
      className="font-semibold cursor-pointer"
    >
      <Upload className="w-5 h-5" />
      Import Data
    </Button>
  );
}
