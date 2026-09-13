"use client";

import { useMemo } from "react";
import type { TaskRepoRow } from "@/components/task-create-dialog-types";
import { useBranches, type BranchSource } from "@/hooks/domains/workspace/use-repository-branches";
import { useRepoBranchAutoselect } from "@/components/task-create-dialog-repo-branch-autoselect";

export type RepositoryBranchDataArgs = {
  row: TaskRepoRow;
  workspaceId: string | null;
  onBranchChange: (value: string) => void;
  branchValue?: string;
  preferredDefaultBranch?: string;
  preferredDefaultBranchLoading?: boolean;
  lastUsedBranch?: string | null;
  userSettingsLoaded?: boolean;
};

export function useRepositoryBranchData({
  row,
  workspaceId,
  onBranchChange,
  branchValue = row.branch,
  preferredDefaultBranch,
  preferredDefaultBranchLoading,
  lastUsedBranch,
  userSettingsLoaded,
}: RepositoryBranchDataArgs) {
  const branchSource = useMemo<BranchSource | null>(() => {
    if (!workspaceId) return null;
    if (row.repositoryId) {
      return { kind: "id", workspaceId, repositoryId: row.repositoryId };
    }
    if (row.localPath) {
      return { kind: "path", workspaceId, path: row.localPath };
    }
    return null;
  }, [workspaceId, row.repositoryId, row.localPath]);
  const {
    branches,
    isLoading: branchesLoading,
    refresh: refreshBranches,
    isLoaded: branchesLoaded,
  } = useBranches(branchSource, !!branchSource);
  useRepoBranchAutoselect({
    branchSource,
    branchesLoading,
    branches,
    rowBranch: branchValue,
    onBranchChange,
    preferredDefaultBranch,
    preferredDefaultBranchLoading,
    lastUsedBranch,
    userSettingsLoaded,
  });
  return { branches, branchesLoading, branchesLoaded, refreshBranches };
}
