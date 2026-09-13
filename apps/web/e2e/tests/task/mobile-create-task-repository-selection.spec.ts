import { test, expect } from "../../fixtures/test-base";
import { assertNoDocumentHorizontalOverflow } from "../../helpers/layout-assertions";
import { useRegularMode } from "../../helpers/regular-mode";
import { MobileKanbanPage } from "../../pages/mobile-kanban-page";
import { dwell } from "../../helpers/causal-waits";

useRegularMode();

test.describe("Create task workspace repository picker on mobile", () => {
  test("adds another local row through the repository sheet", async ({ testPage, prCapture }) => {
    const mobile = new MobileKanbanPage(testPage);
    await mobile.goto();
    await mobile.mobileFab.click();

    const dialog = testPage.getByTestId("create-task-dialog");
    await expect(dialog).toBeVisible();
    const repositoryChips = testPage.getByTestId("repo-chip-trigger");
    const manager = testPage.getByTestId("mobile-repository-manager");
    const management = testPage.getByTestId("mobile-repository-management");

    await manager.tap();
    await expect(management).toBeVisible();
    await expect(repositoryChips.first()).toContainText("E2E Repo");
    await testPage.getByTestId("mobile-repository-add").tap();
    const selectedElsewhere = testPage
      .getByTestId("task-repository-local-option")
      .filter({ hasText: "E2E Repo" });
    await expect(selectedElsewhere).toBeVisible();
    await selectedElsewhere.tap();
    await expect(management).toBeVisible();
    await expect(repositoryChips).toHaveCount(2);
    await expect(repositoryChips.nth(1)).toContainText("E2E Repo");
    await testPage.getByTestId("mobile-repository-done").tap();
    await expect(manager).toContainText("Repositories (2)");
    await dwell(
      testPage,
      300,
      "negative-assertion",
      "a tap must not leave a hover tooltip behind on touch; nothing is rendered to wait for, so the check has to outlast Radix's open delay first",
    );
    await expect(testPage.getByRole("tooltip")).toBeHidden();
    await assertNoDocumentHorizontalOverflow(testPage, "repository picker selection");
    await prCapture.screenshot("mobile-repository-chip-selection", {
      caption:
        "After mobile repository selection, the chip stays contained and no tooltip is shown.",
    });
  });
});
