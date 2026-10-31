with open('frontend/src/context/ProjectContext.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = """export const PIPELINE_STEPS: PipelineStep[] = [
  {
    id: 1,
    slug: 'upload',
    name: '1. Ingest Firmware',
    shortDesc: 'Source upload & shadow isolation',
    path: '/upload',
  },"""

replacement = """export const PIPELINE_STEPS: PipelineStep[] = [
  {
    id: 1,
    slug: 'studio',
    name: 'VS Code Studio',
    shortDesc: 'Live code repair & download',
    path: '/',
  },
  {
    id: 2,
    slug: 'pipeline',
    name: 'Auto Pipeline',
    shortDesc: 'Automated 9-stage orchestrator',
    path: '/pipeline',
  },
  {
    id: 3,
    slug: 'upload',
    name: 'Ingest Firmware',
    shortDesc: 'Source upload & shadow isolation',
    path: '/upload',
  },"""

if target in text:
    text = text.replace(target, replacement)
    print("Added VS Code Studio and Auto Pipeline to PIPELINE_STEPS")

with open('frontend/src/context/ProjectContext.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

