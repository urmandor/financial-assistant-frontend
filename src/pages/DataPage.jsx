import React, { useState, useRef } from 'react';
import { CloudUpload, Download, LoaderCircle } from 'lucide-react';
import { useImportCsv } from '../hooks/useQueries';
import { useToast } from '../hooks/useToast';
import { apiFetch } from '../api/client';

export function DataPage() {
  const toast = useToast();
  const importMutation = useImportCsv();
  const [importResult, setImportResult] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportResult(null);
    try {
      const res = await importMutation.mutateAsync(file);
      setImportResult(res);
      toast.show({
        message: `Imported ${res.inserted ?? 0} transactions!`,
      });
    } catch (err) {
      toast.show({
        message: err instanceof Error ? err.message : 'Import failed',
      });
    }
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const data = await apiFetch('/api/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-assistant-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.show({ message: 'Backup downloaded successfully' });
    } catch (err) {
      toast.show({
        message: err instanceof Error ? err.message : 'Failed to export backup',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-ink">Data & Backup</h2>
        <p className="text-xs text-ink-muted">
          Import your historical statements or back up your records.
        </p>
      </div>

      {/* CSV Import */}
      <div className="card p-5 space-y-4">
        <div className="flex items-start gap-3">
          <span className="icon-chip h-10 w-10 bg-primary-50 text-primary-600 rounded-2xl">
            <CloudUpload size={20} aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-ink">Import bank statement (CSV)</h3>
            <p className="text-xs text-ink-muted">
              Upload a standard CSV statement from your bank. Rules will be automatically applied.
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={importMutation.isPending}
          className="btn-primary w-full"
        >
          {importMutation.isPending ? (
            <>
              <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
              Importing CSV...
            </>
          ) : (
            <>
              <CloudUpload size={18} aria-hidden="true" />
              Select CSV file
            </>
          )}
        </button>

        {importResult && (
          <div className="rounded-2xl border border-line bg-surface-muted p-3 text-xs space-y-1">
            <p className="font-semibold text-ink">Import results:</p>
            <p className="text-ink-soft">
              Added <strong className="text-success-700">{importResult.inserted ?? 0}</strong>{' '}
              transactions, skipped{' '}
              <strong className="text-warning-700">{importResult.skipped ?? 0}</strong> duplicates.
            </p>
            {importResult.errors && importResult.errors.length > 0 && (
              <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-[11px] text-danger-700">
                {importResult.errors.map((err, idx) => (
                  <li key={idx}>
                    Row {err.row}: {err.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* JSON Export */}
      <div className="card p-5 space-y-4">
        <div className="flex items-start gap-3">
          <span className="icon-chip h-10 w-10 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Download size={20} aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-ink">Export complete backup</h3>
            <p className="text-xs text-ink-muted">
              Download all your transactions, categories, budgets, and rules as JSON.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportBackup}
          disabled={isExporting}
          className="btn-secondary w-full"
        >
          {isExporting ? (
            <>
              <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
              Generating backup...
            </>
          ) : (
            <>
              <Download size={18} aria-hidden="true" />
              Download backup (JSON)
            </>
          )}
        </button>
      </div>
    </div>
  );
}
