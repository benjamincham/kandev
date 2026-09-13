"use client";

import { useCallback, useEffect, useMemo } from "react";
import type { LocalRepository, Repository } from "@/lib/types/http";
import type {
  DialogFormState,
  TaskRemoteRepoRow,
  TaskRepoRow,
  TaskRepositorySelection,
} from "@/components/task-create-dialog-types";
import { resolveRepositorySelections } from "@/components/task-create-dialog-repositories-state";
import {
  collectExcludedRepoIds,
  collectSelectedRepoIdentities,
  RepoChip,
} from "@/components/task-create-dialog-workspace-repo-chips";
import {
  RemoteRepoChip,
  selectedRemoteRepositoryIdentity,
} from "@/components/task-create-dialog-remote-repo-chip";
import {
  inspectedRemoteRepositoryUpdate,
  makeURLChange,
  remoteRepositoryUpdateNeeded,
  retryRemoteResolution,
} from "@/components/task-create-dialog-remote-repo-chips";
import { useRemoteRepositories } from "@/hooks/domains/integrations/use-remote-repositories";
import type { RemoteRepository } from "@/hooks/domains/integrations/use-remote-repositories";
import { FolderPicker } from "@/components/folder-picker";
import type { LocalRepositoryChoice } from "@/components/task-create-dialog-repository-picker";
import {
  DesktopMixedRepositoryChips,
  MobileMixedRepositoryChips,
} from "@/components/task-create-dialog-mixed-repository-chips-surfaces";
import { useTouchDrawer } from "@/hooks/use-compact-task-chrome";
import { computeBranchIntent } from "@/components/task-create-dialog-branch-utils";
import { isPickerRemoteProviderUnavailable } from "@/components/task-create-dialog-remote-provider-readiness";
import { useTranslation } from "react-i18next";

export type MixedRepositoryChipsProps = {
  fs: DialogFormState;
  repositories: Repository[];
  workspaceId: string | null;
  isLocalExecutor: boolean;
  repositoryLocked?: boolean;
  branchLocked?: boolean;
  freshBranchEnabled?: boolean;
  branchPolicyDisabledReason?: string;
  freshBranchToggle?: React.ReactNode;
  onRowRepositoryChange: (key: string, value: string) => void;
  onRowBranchChange: (key: string, value: string) => void;
  onRowPolicyChange?: (key: string, policyId: string, baseBranch: string) => void;
  onPolicySelected?: () => void;
  onWorkspacePathChange?: (value: string) => void;
  lastUsedBranch?: string | null;
  userSettingsLoaded?: boolean;
  onCreateRepository?: (key: string) => void;
  repositoryCreationOpen?: boolean;
  onRefreshRepositories?: () => void;
  repositoriesRefreshing?: boolean;
  repositorySets?: React.ReactNode;
};

/** Keeps a newly picked local row open for executor-aware branch selection. */
export function buildLocalRepositorySelection(
  choice: LocalRepositoryChoice,
): Omit<Extract<TaskRepositorySelection, { kind: "local" }>, "key"> {
  return {
    kind: "local",
    ...(choice.repositoryId ? { repositoryId: choice.repositoryId } : {}),
    ...(choice.localPath ? { localPath: choice.localPath } : {}),
    branch: "",
  };
}

/** Renders the ordered local and remote rows with one shared source picker. */
export function MixedRepositoryChips(props: MixedRepositoryChipsProps) {
  const mobile = useTouchDrawer();
  const selections = props.fs.noRepository ? [] : resolveRepositorySelections(props.fs);
  const localRows = selections.filter(isLocalSelection).map(stripLocalKind);
  const remoteRows = selections.filter(isRemoteSelection).map(stripRemoteKind);
  const accessible = useRemoteRepositories(props.workspaceId ?? "");

  useRemoteProviderReadiness(props.fs, accessible);

  useRemoteRowResolution(props.fs, remoteRows);
  const actions = useMixedRepositoryActions(props.fs, selections.length, props.onCreateRepository);
  const selectionRows = (
    <RepositorySelectionRows
      selections={selections}
      localRows={localRows}
      remoteRows={remoteRows}
      repositories={props.repositories}
      fs={props.fs}
      workspaceId={props.workspaceId}
      isLocalExecutor={props.isLocalExecutor}
      freshBranchEnabled={props.freshBranchEnabled}
      branchPolicyDisabledReason={props.branchPolicyDisabledReason}
      onRowRepositoryChange={props.onRowRepositoryChange}
      onRowBranchChange={props.onRowBranchChange}
      onRowPolicyChange={props.onRowPolicyChange}
      onPolicySelected={props.onPolicySelected}
      lastUsedBranch={props.lastUsedBranch}
      userSettingsLoaded={props.userSettingsLoaded}
      onCreateRepository={props.onCreateRepository}
      onRefreshRepositories={props.onRefreshRepositories}
      repositoriesRefreshing={props.repositoriesRefreshing}
      repositoryLocked={props.repositoryLocked}
      branchLocked={props.branchLocked}
      accessible={accessible}
      onRemoveLocal={actions.removeLocal}
      onRemoveRemote={actions.removeRemote}
    />
  );
  const folderPicker = (
    <RepositorySelectionFolder
      hasRows={selections.length > 0}
      noRepository={props.fs.noRepository}
      workspacePath={props.fs.workspacePath}
      onWorkspacePathChange={props.onWorkspacePathChange}
    />
  );

  if (mobile) {
    return (
      <MobileMixedRepositoryChips
        repositories={props.repositories}
        discoveredRepositories={props.fs.discoveredRepositories}
        accessible={accessible}
        workspaceId={props.workspaceId}
        selectionsCount={selections.length}
        selectionRows={selectionRows}
        folderPicker={folderPicker}
        freshBranchToggle={props.freshBranchToggle}
        branchLocked={props.branchLocked}
        repositoryLocked={props.repositoryLocked}
        repositorySets={props.repositorySets}
        onSelectLocal={actions.addLocal}
        onSelectRemote={actions.addRemote}
        onPasteRemote={actions.addPastedRemote}
        onCreateRepository={props.onCreateRepository ? actions.openNewLocalRepository : undefined}
        onRefreshRepositories={props.onRefreshRepositories}
        repositoriesRefreshing={props.repositoriesRefreshing}
        repositoryCreationOpen={props.repositoryCreationOpen}
      />
    );
  }

  return (
    <DesktopMixedRepositoryChips
      repositories={props.repositories}
      discoveredRepositories={props.fs.discoveredRepositories}
      accessible={accessible}
      workspaceId={props.workspaceId}
      selectionRows={selectionRows}
      folderPicker={folderPicker}
      freshBranchToggle={props.freshBranchToggle}
      branchLocked={props.branchLocked}
      repositoryLocked={props.repositoryLocked}
      repositorySets={props.repositorySets}
      onSelectLocal={actions.addLocal}
      onSelectRemote={actions.addRemote}
      onPasteRemote={actions.addPastedRemote}
      onCreateRepository={props.onCreateRepository ? actions.openNewLocalRepository : undefined}
      onRefreshRepositories={props.onRefreshRepositories}
      repositoriesRefreshing={props.repositoriesRefreshing}
    />
  );
}

type RepositorySelectionRowsProps = {
  selections: TaskRepositorySelection[];
  localRows: TaskRepoRow[];
  remoteRows: TaskRemoteRepoRow[];
  repositories: Repository[];
  fs: DialogFormState;
  workspaceId: string | null;
  isLocalExecutor: boolean;
  freshBranchEnabled?: boolean;
  branchPolicyDisabledReason?: string;
  onRowRepositoryChange: (key: string, value: string) => void;
  onRowBranchChange: (key: string, value: string) => void;
  onRowPolicyChange?: (key: string, policyId: string, baseBranch: string) => void;
  onPolicySelected?: () => void;
  lastUsedBranch?: string | null;
  userSettingsLoaded?: boolean;
  onCreateRepository?: (key: string) => void;
  onRefreshRepositories?: () => void;
  repositoriesRefreshing?: boolean;
  repositoryLocked?: boolean;
  branchLocked?: boolean;
  accessible: ReturnType<typeof useRemoteRepositories>;
  onRemoveLocal: (key: string) => void;
  onRemoveRemote: (key: string) => void;
};

function RepositorySelectionRows({
  selections,
  localRows,
  remoteRows,
  repositories,
  fs,
  workspaceId,
  isLocalExecutor,
  freshBranchEnabled,
  branchPolicyDisabledReason,
  onRowRepositoryChange,
  onRowBranchChange,
  onRowPolicyChange,
  onPolicySelected,
  lastUsedBranch,
  userSettingsLoaded,
  onCreateRepository,
  onRefreshRepositories,
  repositoriesRefreshing,
  repositoryLocked,
  branchLocked,
  accessible,
  onRemoveLocal,
  onRemoveRemote,
}: RepositorySelectionRowsProps) {
  return (
    <>
      {selections.map((selection) =>
        selection.kind === "local" ? (
          <LocalSelectionChip
            key={selection.key}
            row={selection}
            rows={localRows}
            repositories={repositories}
            discoveredRepositories={fs.discoveredRepositories}
            fs={fs}
            workspaceId={workspaceId}
            isLocalExecutor={isLocalExecutor}
            freshBranchEnabled={freshBranchEnabled}
            branchPolicyDisabledReason={branchPolicyDisabledReason}
            onRowRepositoryChange={onRowRepositoryChange}
            onRowBranchChange={onRowBranchChange}
            onRowPolicyChange={onRowPolicyChange}
            onPolicySelected={onPolicySelected}
            lastUsedBranch={lastUsedBranch}
            userSettingsLoaded={userSettingsLoaded}
            onCreateRepository={onCreateRepository}
            onRefreshRepositories={onRefreshRepositories}
            repositoriesRefreshing={repositoriesRefreshing}
            repositoryLocked={repositoryLocked}
            branchLocked={branchLocked}
            onRemove={() => onRemoveLocal(selection.key)}
          />
        ) : (
          <RemoteSelectionChip
            key={selection.key}
            row={selection}
            rows={remoteRows}
            fs={fs}
            accessible={accessible}
            repositoryLocked={repositoryLocked}
            branchLocked={branchLocked}
            onRemove={() => onRemoveRemote(selection.key)}
          />
        ),
      )}
    </>
  );
}

function RepositorySelectionFolder({
  hasRows,
  noRepository,
  workspacePath,
  onWorkspacePathChange,
}: {
  hasRows: boolean;
  noRepository: boolean;
  workspacePath: string;
  onWorkspacePathChange?: (value: string) => void;
}) {
  const { t } = useTranslation();
  if (hasRows && !noRepository) return null;
  return (
    <FolderPicker
      value={workspacePath}
      onChange={onWorkspacePathChange ?? (() => undefined)}
      placeholder={t("task:pickAStartingFolderOptional")}
    />
  );
}

function useMixedRepositoryActions(
  fs: DialogFormState,
  selectionCount: number,
  onCreateRepository?: (key: string) => void,
) {
  const appendSelection = fs.appendRepositorySelection;
  const addLocal = useCallback(
    (choice: LocalRepositoryChoice) => {
      fs.setNoRepository(false);
      if (appendSelection) {
        // Leave branch empty so the row's executor-aware autoselector can
        // preserve the current checkout for local execution.
        appendSelection(buildLocalRepositorySelection(choice));
        return;
      }
      fs.addRepository();
    },
    [appendSelection, fs.addRepository, fs.setNoRepository],
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
  const openNewLocalRepository = useCallback(() => {
    if (!appendSelection || !onCreateRepository) return;
    fs.setNoRepository(false);
    const key = appendSelection({ kind: "local", branch: "" });
    onCreateRepository(key);
  }, [appendSelection, fs.setNoRepository, onCreateRepository]);
  const removeLocal = useCallback(
    (key: string) => {
      fs.removeRepository(key);
      if (selectionCount === 1) fs.setNoRepository(true);
    },
    [fs.removeRepository, fs.setNoRepository, selectionCount],
  );
  const removeRemote = useCallback(
    (key: string) => {
      fs.removeRemoteRepo(key);
      if (selectionCount === 1) fs.setNoRepository(true);
    },
    [fs.removeRemoteRepo, fs.setNoRepository, selectionCount],
  );
  return {
    addLocal,
    addRemote,
    addPastedRemote,
    openNewLocalRepository,
    removeLocal,
    removeRemote,
  };
}

function LocalSelectionChip({
  row,
  rows,
  repositories,
  discoveredRepositories,
  fs,
  workspaceId,
  isLocalExecutor,
  freshBranchEnabled,
  branchPolicyDisabledReason,
  onRowRepositoryChange,
  onRowBranchChange,
  onRowPolicyChange,
  onPolicySelected,
  lastUsedBranch,
  userSettingsLoaded,
  onCreateRepository,
  onRefreshRepositories,
  repositoriesRefreshing,
  repositoryLocked,
  branchLocked,
  onRemove,
}: {
  row: TaskRepoRow & { kind: "local" };
  rows: TaskRepoRow[];
  repositories: Repository[];
  discoveredRepositories: LocalRepository[];
  fs: DialogFormState;
  workspaceId: string | null;
  isLocalExecutor: boolean;
  freshBranchEnabled?: boolean;
  branchPolicyDisabledReason?: string;
  onRowRepositoryChange: (key: string, value: string) => void;
  onRowBranchChange: (key: string, value: string) => void;
  onRowPolicyChange?: (key: string, policyId: string, baseBranch: string) => void;
  onPolicySelected?: () => void;
  lastUsedBranch?: string | null;
  userSettingsLoaded?: boolean;
  onCreateRepository?: (key: string) => void;
  onRefreshRepositories?: () => void;
  repositoriesRefreshing?: boolean;
  repositoryLocked?: boolean;
  branchLocked?: boolean;
  onRemove: () => void;
}) {
  const handleBranchChange = (value: string) => {
    if (!isLocalExecutor && row.baseBranch) {
      fs.updateRepository(row.key, { baseBranch: value || undefined });
      return;
    }
    onRowBranchChange(row.key, value);
  };
  return (
    <RepoChip
      row={row}
      workspaceId={workspaceId}
      repositories={repositories}
      discoveredRepositories={discoveredRepositories}
      excludedRepoIds={collectExcludedRepoIds(rows, row, true)}
      selectedElsewhere={collectSelectedRepoIdentities(rows, row)}
      preferredDefaultBranch={isLocalExecutor ? fs.currentLocalBranch : undefined}
      preferredDefaultBranchLoading={isLocalExecutor ? fs.currentLocalBranchLoading : false}
      lastUsedBranch={lastUsedBranch}
      userSettingsLoaded={userSettingsLoaded}
      isLocalExecutor={isLocalExecutor}
      branchValue={isLocalExecutor ? row.branch : row.baseBranch || row.branch}
      savedBaseBranch={row.baseBranch}
      branchPolicyDisabledReason={branchPolicyDisabledReason}
      onRepositoryChange={(value) => onRowRepositoryChange(row.key, value)}
      onBranchChange={handleBranchChange}
      onBaseBranchChange={(value) =>
        fs.updateRepository(row.key, { baseBranch: value || undefined })
      }
      onPolicyChange={
        onRowPolicyChange
          ? (policyId, baseBranch) => onRowPolicyChange(row.key, policyId, baseBranch)
          : undefined
      }
      onPolicySelected={onPolicySelected}
      showBranchPolicies
      showDiscoveryControls
      onCreateRepository={onCreateRepository ? () => onCreateRepository(row.key) : undefined}
      onRefreshRepositories={onRefreshRepositories}
      repositoriesRefreshing={repositoriesRefreshing}
      repositoryLocked={repositoryLocked}
      onRemove={onRemove}
      branchIntent={computeBranchIntent({
        isLocalExecutor,
        rowBranch: isLocalExecutor ? row.branch : row.baseBranch || row.branch,
        currentLocalBranch: fs.currentLocalBranch,
        freshBranchEnabled: !!freshBranchEnabled,
      })}
      branchLocked={branchLocked}
    />
  );
}

function RemoteSelectionChip({
  row,
  rows,
  fs,
  accessible,
  repositoryLocked,
  branchLocked,
  onRemove,
}: {
  row: TaskRemoteRepoRow & { kind: "remote" };
  rows: TaskRemoteRepoRow[];
  fs: DialogFormState;
  accessible: ReturnType<typeof useRemoteRepositories>;
  repositoryLocked?: boolean;
  branchLocked?: boolean;
  onRemove: () => void;
}) {
  const selectedRepositoryIdentities = rows
    .filter((otherRow) => otherRow.key !== row.key)
    .map(selectedRemoteRepositoryIdentity)
    .filter((identity): identity is string => Boolean(identity));
  const connectionUnavailable = isRemoteProviderConnectionUnavailable(row, accessible);
  return (
    <RemoteRepoChip
      row={row}
      branches={fs.branchesByUrl.branches(row.url)}
      branchesLoading={fs.branchesByUrl.loading(row.url)}
      prInfo={fs.prInfoByUrl.info(row.url)}
      resolutionError={fs.branchesByUrl.error(row.url) ?? fs.prInfoByUrl.error(row.url)}
      connectionUnavailable={connectionUnavailable}
      accessibleRepos={accessible}
      selectedRepositoryIdentities={selectedRepositoryIdentities}
      onURLChange={makeURLChange(fs.updateRemoteRepo, row.key)}
      onBranchChange={(branch) => fs.updateRemoteRepo(row.key, { branch })}
      onRetry={() => {
        accessible.refresh?.();
        retryRemoteResolution(fs, row.url);
      }}
      onRemove={onRemove}
      repositoryLocked={repositoryLocked}
      branchLocked={branchLocked}
    />
  );
}

function isRemoteProviderConnectionUnavailable(
  row: TaskRemoteRepoRow,
  accessible: ReturnType<typeof useRemoteRepositories>,
): boolean {
  const readiness = accessible.providerCatalog
    ? Object.fromEntries(
        accessible.providerCatalog.map((entry) => [entry.provider, entry.readiness]),
      )
    : undefined;
  return isPickerRemoteProviderUnavailable(row, readiness);
}

function useRemoteProviderReadiness(
  fs: DialogFormState,
  accessible: ReturnType<typeof useRemoteRepositories>,
) {
  const providerCatalog = accessible.providerCatalog;
  const readiness = useMemo(
    () =>
      providerCatalog
        ? Object.fromEntries(providerCatalog.map((entry) => [entry.provider, entry.readiness]))
        : undefined,
    [providerCatalog],
  );
  useEffect(() => {
    if (!readiness || !fs.setRemoteProviderReadiness) return;
    fs.setRemoteProviderReadiness(readiness);
  }, [fs.setRemoteProviderReadiness, readiness]);
}

function useRemoteRowResolution(fs: DialogFormState, rows: TaskRemoteRepoRow[]) {
  const { ensure: ensureBranches } = fs.branchesByUrl;
  const { ensure: ensurePRInfo } = fs.prInfoByUrl;
  useEffect(() => {
    for (const row of rows) {
      if (!row.url) continue;
      ensureBranches(row.url);
      ensurePRInfo(row.url);
    }
  }, [ensureBranches, ensurePRInfo, rows]);
  const inspection = fs.prInfoByUrl.inspection;
  useEffect(() => {
    if (!inspection) return;
    for (const row of rows) {
      const resolved = inspection(row.url);
      const update = resolved ? inspectedRemoteRepositoryUpdate(resolved, row) : undefined;
      if (update && remoteRepositoryUpdateNeeded(row, update)) fs.updateRemoteRepo(row.key, update);
    }
  }, [fs.updateRemoteRepo, inspection, rows]);
}

function isLocalSelection(
  selection: TaskRepositorySelection,
): selection is Extract<TaskRepositorySelection, { kind: "local" }> {
  return selection.kind === "local";
}

function isRemoteSelection(
  selection: TaskRepositorySelection,
): selection is Extract<TaskRepositorySelection, { kind: "remote" }> {
  return selection.kind === "remote";
}

function stripLocalKind(
  selection: Extract<TaskRepositorySelection, { kind: "local" }>,
): TaskRepoRow & { kind: "local" } {
  return selection;
}

function stripRemoteKind(
  selection: Extract<TaskRepositorySelection, { kind: "remote" }>,
): TaskRemoteRepoRow & { kind: "remote" } {
  return selection;
}
