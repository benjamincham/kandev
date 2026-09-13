"use client";

import type { LocalRepositoryChoice } from "@/components/task-create-dialog-repository-picker";
import { MobileMixedRepositoryChips } from "@/components/task-create-dialog-mixed-repository-chips-surfaces";
import { MobileRepositoryBranchHydrators } from "@/components/task-create-dialog-mobile-branch-hydrators";
import type { MixedRepositoryChipsProps } from "@/components/task-create-dialog-mixed-repository-chips";
import type { TaskRepoRow } from "@/components/task-create-dialog-types";
import type {
  RemoteRepository,
  UseRemoteRepositoriesResult,
} from "@/hooks/domains/integrations/use-remote-repositories";

type MobileMixedRepositoryActions = {
  addLocal: (choice: LocalRepositoryChoice) => void;
  addRemote: (repository: RemoteRepository) => void;
  addPastedRemote: (url: string) => void;
  openNewLocalRepository: () => void;
};

export function MobileMixedRepositorySurface({
  props,
  localRows,
  accessible,
  selectionsCount,
  selectionRows,
  folderPicker,
  actions,
}: {
  props: MixedRepositoryChipsProps;
  localRows: TaskRepoRow[];
  accessible: UseRemoteRepositoriesResult;
  selectionsCount: number;
  selectionRows: React.ReactNode;
  folderPicker: React.ReactNode;
  actions: MobileMixedRepositoryActions;
}) {
  return (
    <>
      <MobileRepositoryBranchHydrators
        rows={localRows}
        fs={props.fs}
        workspaceId={props.workspaceId}
        isLocalExecutor={props.isLocalExecutor}
        onRowBranchChange={props.onRowBranchChange}
        lastUsedBranch={props.lastUsedBranch}
        userSettingsLoaded={props.userSettingsLoaded}
      />
      <MobileMixedRepositoryChips
        repositories={props.repositories}
        discoveredRepositories={props.fs.discoveredRepositories}
        accessible={accessible}
        workspaceId={props.workspaceId}
        selectionsCount={selectionsCount}
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
    </>
  );
}
