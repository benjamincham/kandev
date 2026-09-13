import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlanCommentMigrationNotice } from "./plan-comment-migration-notice";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

afterEach(cleanup);

describe("PlanCommentMigrationNotice", () => {
  it("renders nothing for idle, checking, and complete", () => {
    for (const status of ["idle", "checking", "complete"] as const) {
      const { unmount } = render(<PlanCommentMigrationNotice status={status} retry={vi.fn()} />);

      expect(screen.queryByTestId("plan-comment-migration-notice")).toBeNull();
      unmount();
    }
  });

  it("keeps migration and recovery states visible", () => {
    const retry = vi.fn();
    const { rerender } = render(<PlanCommentMigrationNotice status="running" retry={retry} />);
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.getByText("restoringSavedPlanComments")).toBeTruthy();

    rerender(<PlanCommentMigrationNotice status="waiting_for_plan" retry={retry} />);
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.getByText("planCommentMigrationNeedsPlan")).toBeTruthy();

    rerender(<PlanCommentMigrationNotice status="failed" retry={retry} />);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("planCommentMigrationFailed")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "retry" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
