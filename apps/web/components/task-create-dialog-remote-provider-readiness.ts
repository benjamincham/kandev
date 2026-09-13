import type {
  TaskRemoteRepoRow,
  TaskRepositorySelection,
} from "@/components/task-create-dialog-types";

export type TaskRemoteProviderReadiness = "loading" | "ready" | "unavailable" | "failed";

export type TaskRemoteProviderReadinessMap = Readonly<Record<string, TaskRemoteProviderReadiness>>;

/**
 * Picker rows depend on the provider connection that supplied their identity.
 * Pasted URLs stay provider-neutral until their normal URL inspection completes.
 */
export function isPickerRemoteProviderUnavailable(
  row: TaskRemoteRepoRow,
  readiness: TaskRemoteProviderReadinessMap | undefined,
): boolean {
  if (!readiness || row.source !== "picker" || !row.provider) return false;
  return readiness[row.provider] !== "ready";
}

export function hasUnavailablePickerRemoteProvider(
  selections: TaskRepositorySelection[],
  readiness: TaskRemoteProviderReadinessMap | undefined,
): boolean {
  return selections.some(
    (selection) =>
      selection.kind === "remote" && isPickerRemoteProviderUnavailable(selection, readiness),
  );
}
