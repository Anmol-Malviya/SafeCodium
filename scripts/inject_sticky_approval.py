# Script to inject Option 1 Sticky Approval & Rollback Banner into VsCodeStudio.tsx
p = 'frontend/src/pages/VsCodeStudio.tsx'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

# 1. State for approvals
state_decl = '''  // File-by-File Approval & Review Flow State
  const [approvedFiles, setApprovedFiles] = useState<Record<string, boolean>>({});
  const [isRollbacking, setIsRollbacking] = useState<boolean>(false);
'''
if 'approvedFiles' not in c:
    c = c.replace('  const [editorMode, setEditorMode]', state_decl + '  const [editorMode, setEditorMode]')

# 2. Handlers for File Approval and Rollback
handlers = '''
  // File-by-File Step Approval Controls
  const handleApproveCurrentFile = () => {
    if (!selectedFilePath) return;
    setApprovedFiles((prev) => ({ ...prev, [selectedFilePath]: true }));
    addLog('REVIEW', `Approved & saved fixes for ${selectedFilePath}.`);
    
    // Auto advance to next modified or open file
    const list = files.length > 0 ? files : openTabs.map(t => ({ relative_path: t }));
    const currentIdx = list.findIndex(f => f.relative_path === selectedFilePath);
    if (currentIdx !== -1 && currentIdx < list.length - 1) {
      const nextFile = list[currentIdx + 1].relative_path;
      setSelectedFilePath(nextFile);
      setOpenTabs((prev) => prev.includes(nextFile) ? prev : [...prev, nextFile]);
      addLog('NAV', `Stepped forward to review next file: ${nextFile}`);
    }
  };

  const handleRollbackCurrentFile = async () => {
    if (!selectedProjectId || !selectedFilePath) return;
    setIsRollbacking(true);
    try {
      const res = await api.post('/vibe-chat/rollback-file', {
        project_id: selectedProjectId,
        file_path: selectedFilePath
      });
      const restored = res.data.data?.restored_code || '';
      setCurrentCode(restored);
      setApprovedFiles((prev) => ({ ...prev, [selectedFilePath]: false }));
      addLog('ROLLBACK', `Reverted ${selectedFilePath} back to original baseline.`);
    } catch (err: any) {
      alert(`Rollback failed: ${err.message}`);
    } finally {
      setIsRollbacking(false);
    }
  };

  const handleNextReviewFile = () => {
    const list = files.length > 0 ? files : openTabs.map(t => ({ relative_path: t }));
    const currentIdx = list.findIndex(f => f.relative_path === selectedFilePath);
    if (currentIdx !== -1 && currentIdx < list.length - 1) {
      const next = list[currentIdx + 1].relative_path;
      setSelectedFilePath(next);
      setOpenTabs(prev => prev.includes(next) ? prev : [...prev, next]);
    }
  };

  const handlePrevReviewFile = () => {
    const list = files.length > 0 ? files : openTabs.map(t => ({ relative_path: t }));
    const currentIdx = list.findIndex(f => f.relative_path === selectedFilePath);
    if (currentIdx > 0) {
      const prev = list[currentIdx - 1].relative_path;
      setSelectedFilePath(prev);
      setOpenTabs(p => p.includes(prev) ? p : [...p, prev]);
    }
  };
'''

if 'handleApproveCurrentFile' not in c:
    c = c.replace('  const handleCloseTab =', handlers + '\n  const handleCloseTab =')

# 3. Add Top Sticky Review & Approval Bar above Monaco Editor
bar_target = '          {/* D. MONACO CODE EDITOR CANVAS */}'
sticky_bar = '''          {/* STICKY FILE-BY-FILE APPROVAL & ROLLBACK BANNER */}
          {selectedFilePath && (
            <div className="px-3 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-2xs">
              <div className="flex items-center space-x-2">
                <span className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 font-mono">
                  <FileCode className="w-4 h-4 text-[#2563EB]" />
                  <span>{selectedFilePath}</span>
                </span>
                
                {approvedFiles[selectedFilePath] ? (
                  <span className="flex items-center space-x-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Approved &amp; Saved</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    <span>Review Pending</span>
                  </span>
                )}

                <span className="text-[11px] text-slate-400 font-sans hidden md:inline">
                  ({Object.keys(approvedFiles).filter(k => approvedFiles[k]).length}/{files.length || openTabs.length} Files Approved)
                </span>
              </div>

              {/* Action Buttons: Rollback, Approve, Step Next/Prev, Download */}
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={handlePrevReviewFile}
                  title="Previous file"
                  className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-200 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextReviewFile}
                  title="Next file"
                  className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-200 transition mr-1"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={handleRollbackCurrentFile}
                  disabled={isRollbacking}
                  className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition shadow-2xs cursor-pointer"
                  title="Revert this file back to original state"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Rollback File</span>
                </button>

                <button
                  onClick={handleApproveCurrentFile}
                  className={`flex items-center space-x-1 px-3 py-1 text-xs font-semibold rounded-lg transition shadow-xs ${
                    approvedFiles[selectedFilePath]
                      ? 'text-emerald-700 bg-emerald-50 border border-emerald-200 cursor-default'
                      : 'text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98'
                  }`}
                  title="Approve changes and step to next file"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{approvedFiles[selectedFilePath] ? 'Approved' : 'Approve & Next ➔'}</span>
                </button>

                {selectedProjectId && (
                  <a
                    href={downloadRepairedProjectUrl(selectedProjectId)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-1.5 px-3 py-1 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition shadow-xs ml-1"
                    title="Export full verified project zip with all approved changes"
                  >
                    <Download className="w-3.5 h-3.5 text-white" />
                    <span>Export ZIP</span>
                  </a>
                )}
              </div>
            </div>
          )}

'''

if 'STICKY FILE-BY-FILE APPROVAL' not in c and bar_target in c:
    c = c.replace(bar_target, sticky_bar + bar_target)

# Add api import if needed
if 'import { api } from' not in c and 'import api from' not in c:
    c = "import { api } from '../services/api';\n" + c

with open(p, 'w', encoding='utf-8') as f:
    f.write(c)

print("Successfully injected sticky approval banner into VsCodeStudio.tsx")

