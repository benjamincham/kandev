"use client";

import { useCallback } from "react";
import type { LocalRepositoryChoice } from "@/components/task-create-dialog-repository-picker";
import type { RemoteRepository } from "@/hooks/domains/integrations/use-remote-repositories";
import type {
  DialogFormState,
  TaskRepositorySelection,
} from "@/components/task-create-dialog-types";
import { resolveRepositorySelections } from "@/components/task-create-dialog-repositories-state";

export function buildLocalRepositorySelection(
  choice: LocalRepositoryChoice,
  isLocalExecutor?: boolean,
): Omit<Extract<TaskRepositorySelection, { kind: "local" }>, "key"> {
  return {
    kind: "local",
    ...(choice.repositoryId ? { repositoryId: choice.repositoryId } : {}),
    ...(choice.localPath ? { localPath: choice.localPath } : {}),
    branch: isLocalExecutor === false ? (choice.defaultBranch ?? "") : "",
  };
}

export function useMixedRepositoryActions(
  fs: DialogFormState,
  selectionCount: number,
  isLocalExecutor: boolean,
  onCreateRepository?: (key: string) => void,
) {
  const appendActions = useRepositoryAppendActions(fs, isLocalExecutor, onCreateRepository);
  const removeActions = useRepositoryRemoveActions(fs, selectionCount);
  return { ...appendActions, ...removeActions };
}

function useRepositoryAppendActions(
  fs: DialogFormState,
  isLocalExecutor: boolean,
  onCreateRepository?: (key: string) => void,
) {
  const appendSelection = fs.appendRepositorySelection;
  const addLocal = useCallback(
    (choice: LocalRepositoryChoice) => {
      fs.setNoRepository(false);
      if (appendSelection) {
        appendSelection(buildLocalRepositorySelection(choice, isLocalExecutor));
        return;
      }
      fs.addRepository();
    },
    [appendSelection, fs.addRepository, fs.setNoRepository, isLocalExecutor],
  );
  const addRemote = useCallback(
    (repository: RemoteRepository) => {
      fs.setNoRepository(false);
      if (!appendSelection) {
        fs.addRemoteRepo();
        return;
      }
      appendSelection({
        kind: "remote",
        url: repository.url,
        branch: repository.defaultBranch,
        source: "picker",
        provider: repository.provider,
        remoteUrl: repository.provider === "github" ? undefined : repository.url,
        providerHost: repository.providerHost,
        providerScope: repository.providerScope,
        providerRepoId: repository.id,
        providerOwner: repository.owner,
        providerName: repository.name,
        fullName: repository.fullName,
      });
    },
    [appendSelection, fs.addRemoteRepo, fs.setNoRepository],
  );
  const addPastedRemote = useCallback(
    (url: string) => {
      fs.setNoRepository(false);
      if (!appendSelection) {
        fs.addRemoteRepo();
        return;
      }
      appendSelection({ kind: "remote", url, branch: "", source: "paste" });
    },
    [appendSelection, fs.addRemoteRepo, fs.setNoRepository],
  );
  const addFolder = useCallback(
    (localPath: string) => {
      const path = localPath.trim();
      if (!path || folderAlreadySelected(fs, path)) return;
      fs.setNoRepository(false);
      if (fs.appendFolderSelection) {
        fs.appendFolderSelection({ kind: "folder", localPath: path });
        return;
      }
      fs.setWorkspacePath(path);
    },
    [fs],
  );
  const openNewLocalRepository = useCallback(() => {
    if (!appendSelection || !onCreateRepository) return;
    fs.setNoRepository(false);
    const key = appendSelection({ kind: "local", branch: "" });
    onCreateRepository(key);
  }, [appendSelection, fs.setNoRepository, onCreateRepository]);
  return { addLocal, addRemote, addPastedRemote, addFolder, openNewLocalRepository };
}

function folderAlreadySelected(fs: DialogFormState, path: string): boolean {
  const normalizedPath = normalizeWorkspaceFolderPath(path);
  return resolveRepositorySelections(fs).some(
    (selection) =>
      selection.kind === "folder" &&
      normalizeWorkspaceFolderPath(selection.localPath) === normalizedPath,
  );
}

function useRepositoryRemoveActions(fs: DialogFormState, selectionCount: number) {
  const shouldEnterScratch = selectionCount === 1;
  const removeLocal = useCallback(
    (key: string) => {
      fs.removeRepository(key);
      if (shouldEnterScratch) fs.setNoRepository(true);
    },
    [fs.removeRepository, fs.setNoRepository, shouldEnterScratch],
  );
  const removeRemote = useCallback(
    (key: string) => {
      fs.removeRemoteRepo(key);
      if (shouldEnterScratch) fs.setNoRepository(true);
    },
    [fs.removeRemoteRepo, fs.setNoRepository, shouldEnterScratch],
  );
  const removeFolder = useCallback(
    (key: string) => {
      fs.removeRepository(key);
      if (shouldEnterScratch) fs.setNoRepository(true);
    },
    [fs.removeRepository, fs.setNoRepository, shouldEnterScratch],
  );
  return { removeLocal, removeRemote, removeFolder };
}

function normalizeWorkspaceFolderPath(path: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/\/+$/g, "");
  return normalized || "/";
}
