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
  readLocalProjects,
  writeLocalProjects,
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
      setProjects(readLocalProjects());
      setName(snapshot.presetName);
      if (cloudEnabled) void refreshCloud();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function persist(next: LocalProject[]) {
    setProjects(next);
    writeLocalProjects(next);
  }
  function newLocal() {
    const project = createLocalProject(name, snapshot);
    persist([project, ...projects].slice(0, 20));
    onNotice(
      en ? 'Saved as a local project.' : '端末内プロジェクトとして保存しました',
    );
  }
  function saveVersion(project: LocalProject) {
    const label =
      window.prompt(
        en ? 'Version label' : '版の名前',
        en
          ? `Version ${project.versions.length + 1}`
          : `保存版 ${project.versions.length + 1}`,
      ) ?? '';
    if (!label.trim()) return;
    persist(
      projects.map((item) =>
        item.id === project.id
          ? addProjectVersion(item, snapshot, label)
          : item,
      ),
    );
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
  async function importProject(file: File) {
    try {
      const imported = decodeProjectFile(await file.text());
      persist([imported, ...projects].slice(0, 20));
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
            variant="ghost"
            size="icon-sm"
            aria-label={en ? 'Projects and versions' : 'プロジェクトと版管理'}
          />
        }
      >
        <FolderOpen />
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-1rem)] max-w-[min(760px,calc(100vw-1rem))] overflow-y-auto">
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
        <section className="space-y-3 rounded-xl border p-3">
          <div className="flex items-center gap-2">
            <HardDrive className="size-4" />
            <h3 className="font-semibold">
              {en ? 'On this device' : 'この端末'}
            </h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <Input
              aria-label={en ? 'Project name' : 'プロジェクト名'}
              value={name}
              maxLength={120}
              onChange={(event) => setName(event.target.value)}
              placeholder={en ? 'Project name' : 'プロジェクト名'}
            />
            <Button onClick={newLocal}>
              <Plus />
              {en ? 'New' : '新規保存'}
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
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
                          persist(
                            projects.filter((item) => item.id !== project.id),
                          );
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
