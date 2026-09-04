import {
  cloneSnapshot,
  isEditorSnapshot,
  normalizeSnapshot,
  type EditorSnapshot,
} from '@/lib/pattern-types';

export interface ProjectVersion {
  id: string;
  label: string;
  createdAt: string;
  snapshot: EditorSnapshot;
}

export interface LocalProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  versions: ProjectVersion[];
}

export interface ProjectFileV1 {
  format: 'kikamoyo-project';
  fileVersion: 1;
  exportedAt: string;
  project: LocalProject;
}

const STORAGE_KEY = 'kikamoyo.projects.v1';
const MAX_BYTES = 1_048_576;

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
}

function validVersion(value: unknown): value is ProjectVersion {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<ProjectVersion>;
  return (
    typeof item.id === 'string' &&
    typeof item.label === 'string' &&
    item.label.length <= 120 &&
    typeof item.createdAt === 'string' &&
    isEditorSnapshot(item.snapshot)
  );
}

function validProject(value: unknown): value is LocalProject {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<LocalProject>;
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    item.name.trim().length > 0 &&
    item.name.length <= 120 &&
    typeof item.createdAt === 'string' &&
    typeof item.updatedAt === 'string' &&
    Array.isArray(item.versions) &&
    item.versions.length > 0 &&
    item.versions.length <= 20 &&
    item.versions.every(validVersion)
  );
}

export function readLocalProjects(): LocalProject[] {
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? '[]',
    );
    return Array.isArray(parsed)
      ? parsed.filter(validProject).slice(0, 20)
      : [];
  } catch {
    return [];
  }
}

export function writeLocalProjects(projects: LocalProject[]) {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(projects.slice(0, 20)),
  );
}

export function createLocalProject(
  name: string,
  snapshot: EditorSnapshot,
): LocalProject {
  const now = new Date().toISOString();
  return {
    id: uid('project'),
    name: name.trim().slice(0, 120) || '名称未設定',
    createdAt: now,
    updatedAt: now,
    versions: [
      {
        id: uid('version'),
        label: '初版',
        createdAt: now,
        snapshot: cloneSnapshot(snapshot),
      },
    ],
  };
}

export function addProjectVersion(
  project: LocalProject,
  snapshot: EditorSnapshot,
  label = '保存版',
): LocalProject {
  const now = new Date().toISOString();
  return {
    ...project,
    updatedAt: now,
    versions: [
      {
        id: uid('version'),
        label: label.trim().slice(0, 120) || '保存版',
        createdAt: now,
        snapshot: cloneSnapshot(snapshot),
      },
      ...project.versions,
    ].slice(0, 20),
  };
}

export function encodeProjectFile(project: LocalProject) {
  const file: ProjectFileV1 = {
    format: 'kikamoyo-project',
    fileVersion: 1,
    exportedAt: new Date().toISOString(),
    project,
  };
  return JSON.stringify(file, null, 2);
}

export function decodeProjectFile(text: string): LocalProject {
  if (new TextEncoder().encode(text).byteLength > MAX_BYTES)
    throw new Error('1MBを超えるプロジェクトは読み込めません。');
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== 'object')
    throw new Error('プロジェクト形式ではありません。');
  const file = value as Partial<ProjectFileV1>;
  if (
    file.format !== 'kikamoyo-project' ||
    file.fileVersion !== 1 ||
    !validProject(file.project)
  )
    throw new Error('未対応または壊れたプロジェクトです。');
  const project = file.project;
  const now = new Date().toISOString();
  return {
    ...project,
    id: uid('project'),
    name: `${project.name}（読み込み）`.slice(0, 120),
    createdAt: now,
    updatedAt: now,
    versions: project.versions.map((version) => ({
      ...version,
      id: uid('version'),
      snapshot: normalizeSnapshot(cloneSnapshot(version.snapshot)),
    })),
  };
}
