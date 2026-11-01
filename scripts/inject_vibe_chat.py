# Helper script to inject VibeChatPanel into VsCodeStudio.tsx
p = 'frontend/src/pages/VsCodeStudio.tsx'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Import VibeChatPanel
import_stmt = "import { VibeChatPanel } from '../components/workflow/VibeChatPanel';\n"
if 'VibeChatPanel' not in c:
    c = import_stmt + c

# 2. Update RightPanelTab type
c = c.replace(
    "type RightPanelTab = 'ai-analysis' | 'findings' | 'patch' | 'diff';",
    "type RightPanelTab = 'vibe-chat' | 'ai-analysis' | 'findings' | 'patch' | 'diff';"
)

# 3. Add Left mini-icon for Vibe Chat
left_target = """            <button
              onClick={() => { setActiveRightTab('findings'); }}"""
left_replacement = """            <button
              onClick={() => { setActiveRightTab('vibe-chat'); }}
              title="Vibe Coding Copilot Chat"
              className={`p-1.5 rounded-md transition ${activeRightTab === 'vibe-chat' ? 'text-blue-600 bg-blue-50' : 'hover:text-[#0F172A] hover:bg-[#F8FAFC]'}`}
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
            </button>
            <button
              onClick={() => { setActiveRightTab('findings'); }}"""

if left_target in c:
    c = c.replace(left_target, left_replacement, 1)

# 4. Add Tab button in Right Panel Header
tab_target = """            <div className="flex items-center space-x-1">
              <button
                onClick={() => setActiveRightTab('ai-analysis')"""

tab_replacement = """            <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-0.5">
              <button
                onClick={() => setActiveRightTab('vibe-chat')}
                className={`flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold rounded-md transition shrink-0 ${
                  activeRightTab === 'vibe-chat'
                    ? 'bg-[#EFF6FF] text-[#2563EB] border border-blue-200 shadow-2xs'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Vibe Chat</span>
              </button>

              <button
                onClick={() => setActiveRightTab('ai-analysis')"""

if tab_target in c:
    c = c.replace(tab_target, tab_replacement, 1)

# 5. Render VibeChatPanel content in right panel
content_target = """          {/* Right Panel Content */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">
            
            {/* TAB 1: AI ANALYSIS (Exact Match to Reference Card Layout) */}
            {activeRightTab === 'ai-analysis' && ("""

content_replacement = """          {/* Right Panel Content */}
          {activeRightTab === 'vibe-chat' ? (
            <div className="flex-1 overflow-hidden h-full flex flex-col">
              <VibeChatPanel
                projectId={selectedProjectId}
                currentFilePath={selectedFilePath}
                currentCode={currentCode}
                selectedProvider={selectedProvider}
                onCodeUpdated={(newCode) => {
                  setCurrentCode(newCode);
                  addLog('VIBE_COPILOT', `Patch applied to ${selectedFilePath} in shadow workspace.`);
                }}
              />
            </div>
          ) : (
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">
            
            {/* TAB 1: AI ANALYSIS (Exact Match to Reference Card Layout) */}
            {activeRightTab === 'ai-analysis' && ("""

if content_target in c:
    c = c.replace(content_target, content_replacement, 1)
    aside_target = """          </div>
        </aside>"""
    aside_replacement = """          </div>
          )}
        </aside>"""
    c = c.replace(aside_target, aside_replacement, 1)

with open(p, 'w', encoding='utf-8') as f:
    f.write(c)

print("VsCodeStudio.tsx successfully modified!")

