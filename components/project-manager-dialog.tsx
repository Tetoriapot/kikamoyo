'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Cloud,
  Download,
  FolderOpen,
  HardDrive,
  Plus,
  Save,
  Share2,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  addProjectVersion,
  createLocalProject,
  decodeProjectFile,
  encodeProjectFile,
  writeLocalProjects,
  readProjectLibrary,
  writeProjectLibrary,
  MAX_PROJECTS,
  MAX_VERSIONS,
  MAX_PROJECT_BYTES,
  encodeLibraryBackup,
  decodeLibraryBackup,
  mergeLibraryBackup,
  rawLibraryBackup,
  type ProjectLibrary,
  type LocalProject,
} from '@/lib/project-codec';
import { safeName, triggerDownload } from '@/lib/export-pattern';
import { isEditorSnapshot, type EditorSnapshot } from '@/lib/pattern-types';
import type { Locale } from '@/lib/i18n';

interface CloudProject {
  id: string;
  name: string;
  snapshot: EditorSnapshot;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

function readableDate(value: string, locale: Locale) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
}

export function ProjectManagerDialog({
  snapshot,
  locale,
  onLoad,
  onNotice,
  cloudEnabled = process.env.NEXT_PUBLIC_CLOUD_ENABLED !== 'false',
}: {
  snapshot: EditorSnapshot;
  locale: Locale;
  onLoad: (snapshot: EditorSnapshot, name: string) => void;
  onNotice: (message: string) => void;
  cloudEnabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(snapshot.presetName);
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [trash, setTrash] = useState<LocalProject[]>([]);
  const [localMessage, setLocalMessage] = useState('');
  const [storageReady, setStorageReady] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<ProjectLibrary | null>(
    null,
  );
  const backupRef = useRef<HTMLInputElement>(null);
  const [cloud, setCloud] = useState<CloudProject[]>([]);
  const [cloudMessage, setCloudMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const en = locale === 'en';

  async function refreshCloud() {
    try {
      const response = await fetch('/api/projects', { cache: 'no-store' });
      if (!response.ok) throw new Error();
      const value = (await response.json()) as { projects?: unknown };
      const rows = Array.isArray(value.projects)
        ? value.projects.filter(
            (item): item is CloudProject =>
              Boolean(item) &&
              typeof item === 'object' &&
              typeof (item as CloudProject).id === 'string' &&
              isEditorSnapshot((item as CloudProject).snapshot),
          )
        : [];
      setCloud(rows);
      setCloudMessage('');
    } catch {
      setCloudMessage(
        en
          ? 'Cloud is unavailable right now. Local projects still work.'
          : '現在クラウドへ接続できません。端末内保存は利用できます。',
      );
    }
  }

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      try {
        const library = readProjectLibrary();
        setProjects(library.projects);
        setTrash(library.trash);
        setStorageReady(true);
        setLocalMessage('');
      } catch (error) {
        setStorageReady(false);
        setLocalMessage(String(error));
      }
      setName(snapshot.presetName);
      setPendingBackup(null);
      if (cloudEnabled) void refreshCloud();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function persist(next: LocalProject[]) {
    if (!storageReady) return false;
    try {
      writeLocalProjects(next);
      setProjects(next);
      setLocalMessage('');
      return true;
    } catch {
      setLocalMessage(
        en
          ? 'Save failed. Existing work is kept. Export a JSON backup or free browser storage.'
          : '保存できませんでした。既存作品は保持しています。JSONでバックアップするか、保存容量を確認してください。',
      );
      return false;
    }
  }
  function moveToTrash(project: LocalProject) {
    try {
      const next = {
        projects: projects.filter((item) => item.id !== project.id),
        trash: [project, ...trash],
      };
      writeProjectLibrary(next);
      setProjects(next.projects);
      setTrash(next.trash);
      setLocalMessage(
        en
          ? 'Moved to trash. You can restore it below.'
          : 'ごみ箱へ移動しました。下の一覧から復元できます。',
      );
    } catch {
      setLocalMessage(
        en
          ? 'Could not save the change. Your project is kept.'
          : '変更を保存できなかったため、作品を保持しています。',
      );
    }
  }
  function restoreProject(project: LocalProject) {
    try {
      const next = {
        projects: [project, ...projects],
        trash: trash.filter((item) => item.id !== project.id),
      };
      writeProjectLibrary(next);
      setProjects(next.projects);
      setTrash(next.trash);
      setLocalMessage(en ? 'Restored.' : '復元しました。');
    } catch {
      setLocalMessage(
        en
          ? 'Restoration failed. Check the 20-project limit and available storage.'
          : '復元できませんでした。20作品の上限と保存容量を確認してください。',
      );
    }
  }
  function newLocal() {
    const project = createLocalProject(name, snapshot);
    if (!persist([project, ...projects])) return;
    onNotice(
      en ? 'Saved as a local project.' : '端末内プロジェクトとして保存しました',
    );
  }
  function saveVersion(project: LocalProject) {
    if (project.versions.length >= MAX_VERSIONS) {
      setLocalMessage(
        en
          ? '20 versions reached. Save as a new project.'
          : '20版に達しました。新しい作品として保存してください。',
      );
      return;
    }
    const label =
      window.prompt(
        en ? 'Version label' : '版の名前',
        en
          ? `Version ${project.versions.length + 1}`
          : `保存版 ${project.versions.length + 1}`,
      ) ?? '';
    if (!label.trim()) return;
    if (
      !persist(
        projects.map((item) =>
          item.id === project.id
            ? addProjectVersion(item, snapshot, label)
            : item,
        ),
      )
    )
      return;
    onNotice(en ? 'Saved a new version.' : '新しい版を保存しました');
  }
  function exportProject(project: LocalProject) {
    triggerDownload(
      new Blob([encodeProjectFile(project)], {
        type: 'application/json;charset=utf-8',
      }),
      `${safeName(project.name)}.kikamoyo.json`,
    );
  }
  function exportLibrary() {
    try {
      triggerDownload(
        new Blob(
          [
            storageReady
              ? encodeLibraryBackup(readProjectLibrary())
              : rawLibraryBackup(),
          ],
          { type: 'application/json' },
        ),
        storageReady ? 'kikamoyo-library.json' : 'kikamoyo-raw-recovery.json',
      );
    } catch {
      setLocalMessage(
        en
          ? 'Could not read browser storage for backup.'
          : 'バックアップ用の保存データを読み取れませんでした。',
      );
    }
  }
  async function inspectBackup(file: File) {
    setPendingBackup(null);
    try {
      if (file.size > MAX_PROJECT_BYTES)
        throw new Error(
          en ? 'Backup exceeds 8 MB.' : 'バックアップは8MBまでです。',
        );
      setPendingBackup(decodeLibraryBackup(await file.text()));
      setLocalMessage('');
    } catch (error) {
      setLocalMessage(error instanceof Error ? error.message : String(error));
    }
  }
  function restoreBackup() {
    if (!pendingBackup) return;
    try {
      const merged = mergeLibraryBackup(readProjectLibrary(), pendingBackup);
      writeProjectLibrary(merged);
      setProjects(merged.projects);
      setTrash(merged.trash);
      setPendingBackup(null);
      setLocalMessage(
        en
          ? 'Library restored. Existing work was kept; exact duplicates were skipped.'
          : '復元しました。既存作品は保持し、完全に同じデータは重複追加しません。',
      );
    } catch (error) {
      setLocalMessage(error instanceof Error ? error.message : String(error));
    }
  }
  async function importProject(file: File) {
    try {
      if (file.size > MAX_PROJECT_BYTES)
        throw new Error(
          en
            ? 'Project exceeds 8 MB.'
            : '8MBを超えるファイルは読み込めません。',
        );
      const imported = decodeProjectFile(await file.text());
      if (!persist([imported, ...projects])) return;
      onNotice(
        en
          ? 'Imported a project copy.'
          : 'プロジェクトをコピーとして読み込みました',
      );
    } catch (error) {
      onNotice(
        error instanceof Error
          ? error.message
          : en
            ? 'Import failed.'
            : '読み込みに失敗しました',
      );
    }
  }
  async function createCloud() {
    setBusy(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || snapshot.presetName,
          snapshot,
        }),
      });
      if (!response.ok) throw new Error();
      await refreshCloud();
      onNotice(
        en ? 'Saved to your private cloud.' : '非公開クラウドへ保存しました',
      );
    } catch {
      onNotice(en ? 'Cloud save failed.' : 'クラウド保存に失敗しました');
    } finally {
      setBusy(false);
    }
  }
  async function syncCloud(project: CloudProject) {
    setBusy(true);
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(project.id)}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            name: project.name,
            snapshot,
            baseRevision: project.revision,
            label: `版 ${project.revision + 1}`,
          }),
        },
      );
      if (response.status === 409)
        throw new Error(
          en
            ? 'A newer cloud version exists. Load it before saving.'
            : 'クラウドに新しい版があります。読み込んでから保存してください。',
        );
      if (!response.ok) throw new Error();
      await refreshCloud();
      onNotice(en ? 'Cloud project synced.' : 'クラウド版を同期しました');
    } catch (error) {
      onNotice(
        error instanceof Error && error.message
          ? error.message
          : en
            ? 'Cloud sync failed.'
            : 'クラウド同期に失敗しました',
      );
    } finally {
      setBusy(false);
    }
  }
  async function deleteCloud(project: CloudProject) {
    if (
      !window.confirm(
        en
          ? `Delete ${project.name} from cloud?`
          : `${project.name}をクラウドから削除しますか？`,
      )
    )
      return;
    await fetch(`/api/projects/${encodeURIComponent(project.id)}`, {
      method: 'DELETE',
    });
    await refreshCloud();
  }
  async function shareCloud() {
    setBusy(true);
    try {
      const response = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ snapshot }),
      });
      if (!response.ok) throw new Error();
      const value = (await response.json()) as { token: string };
      const url = new URL(window.location.href);
      url.search = '';
      url.searchParams.set('cloud', value.token);
      await navigator.clipboard.writeText(url.toString());
      onNotice(
        en
          ? 'Copied an immutable cloud share link.'
          : '変更されないクラウド共有リンクをコピーしました',
      );
    } catch {
      onNotice(
        en
          ? 'Could not create a cloud share link.'
          : 'クラウド共有リンクを作成できませんでした',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            id="projects-action"
            variant="ghost"
            size="icon-sm"
            aria-label={en ? 'Projects and versions' : 'プロジェクトと版管理'}
          />
        }
      >
        <FolderOpen />
      </DialogTrigger>
      <DialogContent
        closeLabel={en ? 'Close' : '閉じる'}
        className="max-h-[calc(100dvh-1rem)] max-w-[min(760px,calc(100vw-1rem))] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>
            {en ? 'Projects & versions' : 'プロジェクトと版管理'}
          </DialogTitle>
          <DialogDescription>
            {cloudEnabled
              ? en
                ? 'Keep named versions on this device, import/export JSON, or sync privately.'
                : '名前付きの版を端末内に保存し、JSON入出力や非公開同期ができます。'
              : en
                ? 'Keep named versions on this device, or import and export JSON.'
                : '名前付きの版を端末内に保存し、JSONで入出力できます。'}
          </DialogDescription>
        </DialogHeader>
        <p className="ui-help">
          {en
            ? 'Browser storage is not a file backup. Export project JSON to continue on another device. Nothing is removed automatically at the limit.'
            : '端末内保存はこのブラウザー内の保存です。別の端末で続けるには再編集用JSONを保存してください。上限に達しても自動削除しません。'}
        </p>
        <output aria-live="polite">{localMessage}</output>
        <section className="space-y-3 rounded-xl border p-3">
          <h3 className="font-semibold">
            {en ? 'Library backup' : 'ライブラリのバックアップ'}
          </h3>
          <p className="text-xs text-muted-foreground">
            {en
              ? 'Includes saved projects, every version, trash and brand colors. Save the current edit as a project first. Personal preset lists and display preferences are not included. Restore adds data without replacing existing work.'
              : '保存済み作品・全版・ごみ箱・ブランド色を含みます。編集中の作品は先に新規保存してください。マイ見本一覧・表示設定は対象外です。復元は既存データを消さずに追加します。'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportLibrary}>
              <Download />
              {storageReady
                ? en
                  ? 'Back up library'
                  : 'まとめてバックアップ'
                : en
                  ? 'Save raw recovery data'
                  : '復旧用の生データを保存'}
            </Button>
            <Button
              variant="outline"
              disabled={!storageReady}
              onClick={() => backupRef.current?.click()}
            >
              <Upload />
              {en ? 'Restore backup' : 'バックアップを復元'}
            </Button>
          </div>
          {!storageReady && (
            <p className="text-xs">
              {en
                ? 'Raw recovery data is for troubleshooting; it cannot be imported directly.'
                : '復旧用の生データは調査用です。そのまま読み込むことはできません。'}
            </p>
          )}
          <input
            ref={backupRef}
            type="file"
            hidden
            accept=".json"
            aria-label={
              en ? 'Choose library backup' : 'ライブラリバックアップを選択'
            }
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void inspectBackup(file);
              event.target.value = '';
            }}
          />
          {pendingBackup && (
            <div className="space-y-2 rounded-lg bg-muted p-3">
              <p>
                {en ? 'Ready to merge:' : '復元対象:'}{' '}
                {pendingBackup.projects.length} {en ? 'projects' : '作品'} /{' '}
                {pendingBackup.trash.length} {en ? 'in trash' : 'ごみ箱'} /{' '}
                {pendingBackup.brandPalettes?.length ?? 0}{' '}
                {en ? 'palettes' : '配色'}
              </p>
              <Button onClick={restoreBackup}>
                {en ? 'Confirm and restore' : '内容を確認して復元'}
              </Button>
              <Button variant="ghost" onClick={() => setPendingBackup(null)}>
                {en ? 'Cancel' : 'キャンセル'}
              </Button>
            </div>
          )}
        </section>
        <section className="space-y-3 rounded-xl border p-3">
          <div className="flex items-center gap-2">
            <HardDrive className="size-4" />
            <h3 className="font-semibold">
              {en ? 'On this device' : 'この端末'}
            </h3>
            <span className="ui-help">
              {projects.length} / {MAX_PROJECTS}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <Input
              aria-label={en ? 'Project name' : 'プロジェクト名'}
              value={name}
              maxLength={120}
              onChange={(event) => setName(event.target.value)}
              placeholder={en ? 'Project name' : 'プロジェクト名'}
            />
            <Button
              onClick={newLocal}
              disabled={!storageReady || projects.length >= MAX_PROJECTS}
            >
              <Plus />
              {en ? 'New' : '新規保存'}
            </Button>
            <Button
              variant="outline"
              disabled={!storageReady || projects.length >= MAX_PROJECTS}
              onClick={() => fileRef.current?.click()}
            >
              <Upload />
              {en ? 'Import' : '読込'}
            </Button>
            <input
              aria-label={
                en ? 'Import project JSON' : 'プロジェクトJSONを読み込む'
              }
              ref={fileRef}
              hidden
              type="file"
              accept=".json,.kikamoyo"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importProject(file);
                event.target.value = '';
              }}
            />
          </div>
          <div className="space-y-2">
            {projects.map((project) => (
              <details
                key={project.id}
                className="rounded-xl border bg-muted/20 p-2"
              >
                <summary
                  aria-label={
                    en
                      ? `Versions for ${project.name}`
                      : `${project.name}の版一覧`
                  }
                  className="cursor-pointer list-none"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <strong className="block truncate text-sm">
                        {project.name}
                      </strong>
                      <span className="ui-help text-muted-foreground">
                        {project.versions.length}
                        {en ? ' versions' : '版'} ·{' '}
                        {readableDate(project.updatedAt, locale)}
                      </span>
                    </span>
                    <span className="flex gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={en ? 'Save version' : '版を保存'}
                        disabled={project.versions.length >= MAX_VERSIONS}
                        title={
                          en
                            ? 'Up to 20 versions; then save a new project'
                            : '20版まで保存可能。上限時は新しい作品として保存'
                        }
                        onClick={(event) => {
                          event.preventDefault();
                          saveVersion(project);
                        }}
                      >
                        <Save />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={en ? 'Export JSON' : 'JSON書き出し'}
                        onClick={(event) => {
                          event.preventDefault();
                          exportProject(project);
                        }}
                      >
                        <Download />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={en ? 'Delete project' : '削除'}
                        onClick={(event) => {
                          event.preventDefault();
                          moveToTrash(project);
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </span>
                  </span>
                </summary>
                <div className="mt-2 space-y-1 border-t pt-2">
                  {project.versions.map((version) => (
                    <button
                      key={version.id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-xs hover:bg-muted"
                      onClick={() => {
                        onLoad(version.snapshot, project.name);
                        setOpen(false);
                      }}
                    >
                      <span>{version.label}</span>
                      <span className="text-muted-foreground">
                        {readableDate(version.createdAt, locale)}
                      </span>
                    </button>
                  ))}
                </div>
              </details>
            ))}
          </div>
          {!projects.length && (
            <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
              {en
                ? 'Save the current work as your first project.'
                : '現在の作品を最初のプロジェクトとして保存できます。'}
            </p>
          )}
          {trash.length > 0 && (
            <details className="rounded-lg border p-3">
              <summary>
                {en
                  ? 'Trash — recoverable projects'
                  : 'ごみ箱 — 復元できる作品'}{' '}
                ({trash.length})
              </summary>
              <div className="mt-3 space-y-2">
                {trash.map((project) => (
                  <div
                    className="flex items-center justify-between gap-2"
                    key={project.id}
                  >
                    <span className="truncate">{project.name}</span>
                    <Button
                      variant="outline"
                      disabled={projects.length >= MAX_PROJECTS}
                      onClick={() => restoreProject(project)}
                    >
                      {en ? 'Restore' : '復元'}
                    </Button>
                  </div>
                ))}
              </div>
            </details>
          )}
        </section>
        {cloudEnabled && (
          <section className="space-y-3 rounded-xl border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Cloud className="size-4" />
                <h3 className="font-semibold">
                  {en ? 'Private cloud' : '非公開クラウド'}
                </h3>
              </span>
              <span className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={shareCloud}
                  disabled={busy}
                >
                  <Share2 />
                  {en ? 'Share copy' : '共有コピー'}
                </Button>
                <Button size="sm" onClick={createCloud} disabled={busy}>
                  <Cloud />
                  {en ? 'Save new' : '新規保存'}
                </Button>
              </span>
            </div>
            <p className="ui-help text-muted-foreground">
              {en
                ? 'Only signed-in people allowed to this private site can open a shared link.'
                : '共有リンクも、この非公開サイトへのアクセス権がある相手だけが開けます。'}
            </p>
            {cloudMessage && (
              <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                {cloudMessage}
              </p>
            )}
            <div className="space-y-2">
              {cloud.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center gap-2 rounded-xl border p-2"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => {
                      onLoad(project.snapshot, project.name);
                      setOpen(false);
                    }}
                  >
                    <strong className="block truncate text-sm">
                      {project.name}
                    </strong>
                    <span className="ui-help text-muted-foreground">
                      v{project.revision} ·{' '}
                      {readableDate(project.updatedAt, locale)}
                    </span>
                  </button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void syncCloud(project)}
                  >
                    {en ? 'Sync' : '同期'}
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={
                      en ? 'Delete cloud project' : 'クラウドから削除'
                    }
                    onClick={() => void deleteCloud(project)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}
