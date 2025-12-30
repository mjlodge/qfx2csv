import { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileDropZoneProps {
  onFileSelect: (content: string, fileName: string) => void;
  isProcessing: boolean;
}

export function FileDropZone({ onFileSelect, isProcessing }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!file.name.toLowerCase().endsWith('.qfx') && !file.name.toLowerCase().endsWith('.ofx')) {
        setError('Please upload a QFX or OFX file');
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError('File too large. Maximum size is 10MB');
        return;
      }

      try {
        const content = await file.text();
        onFileSelect(content, file.name);
      } catch (err) {
        setError('Failed to read file');
      }
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  return (
    <div className="w-full">
      <label
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'group relative flex flex-col items-center justify-center w-full h-64 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-300',
          isDragging
            ? 'border-primary bg-primary/10 scale-[1.02]'
            : 'border-border hover:border-primary/50 hover:bg-secondary/30',
          isProcessing && 'pointer-events-none opacity-50'
        )}
      >
        <input
          type="file"
          accept=".qfx,.ofx"
          onChange={handleInputChange}
          className="hidden"
          disabled={isProcessing}
        />

        <div
          className={cn(
            'flex flex-col items-center gap-4 transition-transform duration-300',
            isDragging && 'scale-110'
          )}
        >
          <div
            className={cn(
              'p-4 rounded-2xl transition-all duration-300',
              isDragging ? 'bg-primary/20' : 'bg-secondary group-hover:bg-primary/10'
            )}
          >
            {isDragging ? (
              <FileText className="w-10 h-10 text-primary" />
            ) : (
              <Upload className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
            )}
          </div>

          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-foreground">
              {isDragging ? 'Drop your file here' : 'Drop QFX file here'}
            </p>
            <p className="text-sm text-muted-foreground">or click to browse</p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-mono">.qfx .ofx</span>
          </div>
        </div>

        {/* Animated border */}
        {isDragging && (
          <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
            <div className="absolute inset-0 animate-pulse-glow" />
          </div>
        )}
      </label>

      {error && (
        <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive animate-fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  );
}
