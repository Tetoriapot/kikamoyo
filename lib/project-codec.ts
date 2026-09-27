import {
  cloneSnapshot,
  isEditorSnapshot,
  isEditorDocument,
  normalizeSnapshot,
  type EditorSnapshot,
} from '@/lib/pattern-types';
import {
  BRAND_PALETTE_KEY,
  MAX_BRAND_PALETTES,
  isBrandPalette,
  type BrandPalette,
} from '@/lib/brand-palettes';

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
const LIBRARY_KEY = 'kikamoyo.library.v2';
export const MAX_PROJECTS = 20;
export const MAX_VERSIONS = 20;
export const MAX_PROJECT_BYTES = 8_388_608;
export interface ProjectLibrary {
  projects: LocalProject[];
  trash: LocalProject[];
  brandPalettes?: BrandPalette[];
}

function readLegacyPalettes(): BrandPalette[] {
  const value: unknown = JSON.parse(
    window.localStorage.getItem(BRAND_PALETTE_KEY) ?? '[]',
  );
  if (!Array.isArray(value) || !value.every(isBrandPalette))
    throw new Error('Invalid saved palettes');
  return value;
}

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

export function validProject(value: unknown): value is LocalProject {
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

export function readProjectLibrary(): ProjectLibrary {
  try {
    const saved = window.localStorage.getItem(LIBRARY_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as ProjectLibrary;
      if (
        !Array.isArray(parsed.projects) ||
        !Array.isArray(parsed.trash) ||
        !parsed.projects.every(validProject) ||
        !parsed.trash.every(validProject)
      )
        throw new Error('Invalid library');
      const brandPalettes = parsed.brandPalettes ?? readLegacyPalettes();
      if (!Array.isArray(brandPalettes) || !brandPalettes.every(isBrandPalette))
        throw new Error('Invalid palettes');
      return { ...parsed, brandPalettes };
    }
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? '[]',
    );
    if (!Array.isArray(parsed) || !parsed.every(validProject))
      throw new Error('Invalid projects');
    return { projects: parsed, trash: [], brandPalettes: readLegacyPalettes() };
  } catch {
    throw new Error(
      '保存データを読み込めません。ブラウザーのデータを消さず、バックアップを確認してください。 / Cannot read saved projects.',
    );
  }
}

export function readLocalProjects(): LocalProject[] {
  return readProjectLibrary().projects;
}

export function writeProjectLibrary(library: ProjectLibrary) {
  if (
    library.projects.length > MAX_PROJECTS ||
    !library.projects.every(validProject) ||
    !library.trash.every(validProject)
  )
    throw new Error(
      '保存上限は20作品です。既存作品は保持されています。 / Project limit reached.',
    );
  const brandPalettes =
    library.brandPalettes ?? readProjectLibrary().brandPalettes ?? [];
  if (
    brandPalettes.length > MAX_BRAND_PALETTES ||
    !brandPalettes.every(isBrandPalette)
  )
    throw new Error(
      'ブランド色は20組までです。 / Brand palette limit reached.',
    );
  window.localStorage.setItem(
    LIBRARY_KEY,
    JSON.stringify({ ...library, brandPalettes }),
  );
}

export function readBrandPalettes(): BrandPalette[] {
  return readProjectLibrary().brandPalettes ?? [];
}
export function writeBrandPalettes(brandPalettes: BrandPalette[]) {
  writeProjectLibrary({ ...readProjectLibrary(), brandPalettes });
}

export function encodeLibraryBackup(library: ProjectLibrary): string {
  return JSON.stringify(
    {
      format: 'kikamoyo-library',
      fileVersion: 1,
      exportedAt: new Date().toISOString(),
      library: { ...library, brandPalettes: library.brandPalettes ?? [] },
    },
    null,
    2,
  );
}

export function decodeLibraryBackup(text: string): ProjectLibrary {
  if (new TextEncoder().encode(text).byteLength > MAX_PROJECT_BYTES)
    throw new Error('バックアップは8MBまでです。 / Backup exceeds 8 MB.');
  const value = JSON.parse(text);
  const library = value?.library;
  if (
    value?.format !== 'kikamoyo-library' ||
    value.fileVersion !== 1 ||
    !library ||
    !Array.isArray(library.projects) ||
    !Array.isArray(library.trash) ||
    !Array.isArray(library.brandPalettes) ||
    library.projects.length > MAX_PROJECTS ||
    library.brandPalettes.length > MAX_BRAND_PALETTES ||
    !library.projects.every(validProject) ||
    !library.trash.every(validProject) ||
    !library.brandPalettes.every(isBrandPalette)
  )
    throw new Error(
      '未対応または壊れたバックアップです。 / Invalid library backup.',
    );
  const projectIds = [...library.projects, ...library.trash].map(
    (item: LocalProject) => item.id,
  );
  if (
    new Set(projectIds).size !== projectIds.length ||
    new Set(library.brandPalettes.map((item: BrandPalette) => item.id)).size !==
      library.brandPalettes.length
  )
    throw new Error(
      'バックアップ内のIDが重複しています。 / Duplicate backup IDs.',
    );
  return library;
}

/** Validate and merge first, then the caller commits all projects and colors in one storage write. */
export function mergeLibraryBackup(
  current: ProjectLibrary,
  incoming: ProjectLibrary,
): ProjectLibrary {
  const projects = [...current.projects];
  const trash = [...current.trash];
  const known = new Map([...projects, ...trash].map((item) => [item.id, item]));
  for (const [items, target] of [
    [incoming.projects, projects],
    [incoming.trash, trash],
  ] as const) {
    for (const item of items) {
      const existing = known.get(item.id);
      if (existing && JSON.stringify(existing) === JSON.stringify(item))
        continue;
      const copy = { ...item, id: existing ? uid('project') : item.id };
      target.push(copy);
      known.set(copy.id, copy);
    }
  }
  const brandPalettes = [...(current.brandPalettes ?? [])];
  for (const item of incoming.brandPalettes ?? []) {
    const existing = brandPalettes.find((palette) => palette.id === item.id);
    if (existing && JSON.stringify(existing) === JSON.stringify(item)) continue;
    brandPalettes.push({ ...item, id: existing ? uid('palette') : item.id });
  }
  if (
    projects.length > MAX_PROJECTS ||
    brandPalettes.length > MAX_BRAND_PALETTES
  )
    throw new Error(
      '復元すると20作品または20配色の上限を超えます。既存データは変更していません。 / Restore would exceed library limits. Nothing was changed.',
    );
  return { projects, trash, brandPalettes };
}

export function rawLibraryBackup() {
  return JSON.stringify(
    {
      format: 'kikamoyo-recovery-raw',
      library: window.localStorage.getItem(LIBRARY_KEY),
      legacyProjects: window.localStorage.getItem(STORAGE_KEY),
      legacyPalettes: window.localStorage.getItem(BRAND_PALETTE_KEY),
    },
    null,
    2,
  );
}

export function writeLocalProjects(projects: LocalProject[]) {
  writeProjectLibrary({ ...readProjectLibrary(), projects });
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
  if (project.versions.length >= MAX_VERSIONS)
    throw new Error(
      '1作品20版までです。新しい作品として保存してください。 / Version limit reached.',
    );
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
    ],
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
  if (new TextEncoder().encode(text).byteLength > MAX_PROJECT_BYTES)
    throw new Error(
      '8MBを超えるプロジェクトは読み込めません。 / Project exceeds 8 MB.',
    );
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== 'object')
    throw new Error('プロジェクト形式ではありません。');
  const file = value as Partial<ProjectFileV1>;
  const legacy = value as {
    format?: string;
    version?: number;
    name?: string;
    document?: unknown;
  };
  if (
    legacy.format === 'kikamoyo' &&
    legacy.version === 1 &&
    isEditorDocument(legacy.document)
  ) {
    const document = legacy.document;
    const name =
      typeof legacy.name === 'string'
        ? legacy.name.slice(0, 120)
        : 'Imported artwork';
    return createLocalProject(name, {
      sessionVersion: 1,
      document,
      presetId: null,
      presetName: name || 'Imported artwork',
      activeLayerId: document.layers[0].id,
    });
  }
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
