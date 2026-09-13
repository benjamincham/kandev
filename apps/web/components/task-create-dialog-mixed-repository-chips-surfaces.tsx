"use client";

import { useState } from "react";
import { IconArrowLeft, IconPlus } from "@tabler/icons-react";
import { Button } from "@kandev/ui/button";
import type { LocalRepository, Repository } from "@/lib/types/http";
import {
  AddRepositoryPicker,
  RepositoryPicker,
  type LocalRepositoryChoice,
} from "@/components/task-create-dialog-repository-picker";
import { MobilePickerSheet } from "@/components/task/mobile/mobile-picker-sheet";
import type {
  RemoteRepository,
  UseRemoteRepositoriesResult,
} from "@/hooks/domains/integrations/use-remote-repositories";
import { useTranslation } from "react-i18next";

type MobileMixedRepositoryChipsProps = {
  repositories: Repository[];
  discoveredRepositories: LocalRepository[];
  accessible: UseRemoteRepositoriesResult;
  workspaceId: string | null;
  selectionsCount: number;
  selectionRows: React.ReactNode;
  folderPicker: React.ReactNode;
  freshBranchToggle?: React.ReactNode;
  branchLocked?: boolean;
  repositoryLocked?: boolean;
  repositorySets?: React.ReactNode;
  onSelectLocal: (choice: LocalRepositoryChoice) => void;
  onSelectRemote: (repository: RemoteRepository) => void;
  onPasteRemote: (url: string) => void;
  onCreateRepository?: () => void;
  onRefreshRepositories?: () => void;
  repositoriesRefreshing?: boolean;
  repositoryCreationOpen?: boolean;
};

export function MobileMixedRepositoryChips({
  repositories,
  discoveredRepositories,
  accessible,
  workspaceId,
  selectionsCount,
  selectionRows,
  folderPicker,
  freshBranchToggle,
  branchLocked,
  repositoryLocked,
  repositorySets,
  onSelectLocal,
  onSelectRemote,
  onPasteRemote,
  onCreateRepository,
  onRefreshRepositories,
  repositoriesRefreshing,
  repositoryCreationOpen,
}: MobileMixedRepositoryChipsProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"manage" | "add">("manage");
  const close = () => {
    setOpen(false);
    setView("manage");
  };
  const pickerProps = {
    repositories,
    discoveredRepositories,
    accessible,
    scopeKey: workspaceId ?? "",
    onSelectLocal: (choice: LocalRepositoryChoice) => {
      onSelectLocal(choice);
      setView("manage");
    },
    onSelectRemote: (repository: RemoteRepository) => {
      onSelectRemote(repository);
      setView("manage");
    },
    onPasteRemote: (url: string) => {
      onPasteRemote(url);
      setView("manage");
    },
    onRefresh: () => {
      accessible.refresh?.();
      onRefreshRepositories?.();
    },
    refreshing: repositoriesRefreshing,
    onCreateRepository: onCreateRepository
      ? () => {
          onCreateRepository();
          setView("manage");
        }
      : undefined,
  };
  return (
    <>
      <button
        type="button"
        onClick={() => {
          accessible.refresh?.();
          onRefreshRepositories?.();
          setView("manage");
          setOpen(true);
        }}
        aria-haspopup="dialog"
        data-testid="mobile-repository-manager"
        className="inline-flex min-h-11 items-center justify-center rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {t("task:repositoriesSelected", { count: selectionsCount })}
      </button>
      <MobileRepositorySheet
        open={open}
        view={view}
        selectionsCount={selectionsCount}
        onOpenChange={setOpen}
        onClose={close}
        onViewChange={setView}
        pickerProps={pickerProps}
        selectionRows={selectionRows}
        branchLocked={branchLocked}
        freshBranchToggle={freshBranchToggle}
        repositoryLocked={repositoryLocked}
        repositorySets={repositorySets}
        folderPicker={folderPicker}
        repositoryCreationOpen={repositoryCreationOpen}
      />
    </>
  );
}

function MobileRepositorySheet({
  open,
  view,
  selectionsCount,
  onOpenChange,
  onClose,
  onViewChange,
  pickerProps,
  selectionRows,
  branchLocked,
  freshBranchToggle,
  repositoryLocked,
  repositorySets,
  folderPicker,
  repositoryCreationOpen,
}: {
  open: boolean;
  view: "manage" | "add";
  selectionsCount: number;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  onViewChange: (view: "manage" | "add") => void;
  pickerProps: React.ComponentProps<typeof RepositoryPicker>;
  selectionRows: React.ReactNode;
  branchLocked?: boolean;
  freshBranchToggle?: React.ReactNode;
  repositoryLocked?: boolean;
  repositorySets?: React.ReactNode;
  folderPicker: React.ReactNode;
  repositoryCreationOpen?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <MobilePickerSheet
      open={open}
      onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : onClose())}
      title={
        view === "add"
          ? t("task:addRepository")
          : t("task:repositoriesSelected", { count: selectionsCount })
      }
      headerAction={
        view === "add" ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => onViewChange("manage")}
            data-testid="mobile-repository-back"
            className="min-h-11 cursor-pointer px-2 text-xs"
          >
            <IconArrowLeft className="mr-1 size-4" aria-hidden="true" />
            {t("common:back")}
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            data-testid="mobile-repository-done"
            className="min-h-11 cursor-pointer px-2 text-xs"
          >
            {t("task:done")}
          </Button>
        )
      }
      contentTestId="mobile-repository-sheet-content"
      onEscapeKeyDown={(event) => {
        if (
          repositoryCreationOpen ||
          document.querySelector('[data-testid="create-local-repository-drawer"]')
        ) {
          event.preventDefault();
        }
      }}
      onPointerDownOutside={repositoryCreationOpen ? (event) => event.preventDefault() : undefined}
      onFocusOutside={(event) => event.preventDefault()}
    >
      <MobileRepositorySheetBody
        view={view}
        pickerProps={pickerProps}
        selectionRows={selectionRows}
        branchLocked={branchLocked}
        freshBranchToggle={freshBranchToggle}
        repositoryLocked={repositoryLocked}
        onAdd={() => {
          pickerProps.onRefresh();
          onViewChange("add");
        }}
        repositorySets={repositorySets}
        folderPicker={folderPicker}
      />
    </MobilePickerSheet>
  );
}

function MobileRepositorySheetBody({
  view,
  pickerProps,
  selectionRows,
  branchLocked,
  freshBranchToggle,
  repositoryLocked,
  onAdd,
  repositorySets,
  folderPicker,
}: {
  view: "manage" | "add";
  pickerProps: React.ComponentProps<typeof RepositoryPicker>;
  selectionRows: React.ReactNode;
  branchLocked?: boolean;
  freshBranchToggle?: React.ReactNode;
  repositoryLocked?: boolean;
  onAdd: () => void;
  repositorySets?: React.ReactNode;
  folderPicker: React.ReactNode;
}) {
  const { t } = useTranslation();
  if (view === "add") return <RepositoryPicker {...pickerProps} />;
  return (
    <div className="flex flex-col gap-3" data-testid="mobile-repository-management">
      <div className="flex flex-col gap-2">{selectionRows}</div>
      {branchLocked ? null : freshBranchToggle}
      <div className="flex flex-wrap items-center gap-2">
        {repositoryLocked ? null : (
          <button
            type="button"
            onClick={onAdd}
            data-testid="mobile-repository-add"
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <IconPlus className="size-3.5" aria-hidden="true" />
            {t("task:addRepository")}
          </button>
        )}
        {repositorySets}
      </div>
      {folderPicker}
    </div>
  );
}

type DesktopMixedRepositoryChipsProps = {
  repositories: Repository[];
  discoveredRepositories: LocalRepository[];
  accessible: UseRemoteRepositoriesResult;
  workspaceId: string | null;
  selectionRows: React.ReactNode;
  folderPicker: React.ReactNode;
  freshBranchToggle?: React.ReactNode;
  branchLocked?: boolean;
  repositoryLocked?: boolean;
  repositorySets?: React.ReactNode;
  onSelectLocal: (choice: LocalRepositoryChoice) => void;
  onSelectRemote: (repository: RemoteRepository) => void;
  onPasteRemote: (url: string) => void;
  onCreateRepository?: () => void;
  onRefreshRepositories?: () => void;
  repositoriesRefreshing?: boolean;
};

export function DesktopMixedRepositoryChips({
  repositories,
  discoveredRepositories,
  accessible,
  workspaceId,
  selectionRows,
  folderPicker,
  freshBranchToggle,
  branchLocked,
  repositoryLocked,
  repositorySets,
  onSelectLocal,
  onSelectRemote,
  onPasteRemote,
  onCreateRepository,
  onRefreshRepositories,
  repositoriesRefreshing,
}: DesktopMixedRepositoryChipsProps) {
  return (
    <div
      className="flex min-h-9 w-full flex-wrap items-center gap-2"
      data-testid="mixed-repository-chips"
    >
      {selectionRows}
      {branchLocked ? null : freshBranchToggle}
      {repositoryLocked ? null : (
        <AddRepositoryPicker
          repositories={repositories}
          discoveredRepositories={discoveredRepositories}
          accessible={accessible}
          scopeKey={workspaceId ?? ""}
          onSelectLocal={onSelectLocal}
          onSelectRemote={onSelectRemote}
          onPasteRemote={onPasteRemote}
          onCreateRepository={onCreateRepository}
          onOpen={() => {
            accessible.refresh?.();
            onRefreshRepositories?.();
          }}
          refreshing={repositoriesRefreshing}
          onRefresh={() => {
            accessible.refresh?.();
            onRefreshRepositories?.();
          }}
        />
      )}
      {repositorySets}
      {folderPicker}
    </div>
  );
}
