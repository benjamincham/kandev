import type { Page } from "@playwright/test";

const NOTICE_SELECTOR = '[data-testid="plan-comment-migration-notice"]';

export async function watchPlanCommentMigrationNotice(page: Page): Promise<string> {
  const markerKey = `__kandev_plan_comment_migration_notice_${Math.random().toString(36).slice(2)}`;
  await page.addInitScript((key) => {
    const hasVisibleNotice = () =>
      Array.from(
        document.querySelectorAll<HTMLElement>('[data-testid="plan-comment-migration-notice"]'),
      ).some((element) => {
        const style = getComputedStyle(element);
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          element.getClientRects().length > 0
        );
      });
    const markIfVisible = () => {
      if (hasVisibleNotice()) window.sessionStorage.setItem(key, "true");
    };
    const observe = () => {
      markIfVisible();
      new MutationObserver(markIfVisible).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class", "data-state", "hidden", "style"],
        childList: true,
        subtree: true,
      });
    };
    if (document.documentElement) observe();
    else document.addEventListener("DOMContentLoaded", observe, { once: true });
  }, markerKey);
  return markerKey;
}

export function migrationNoticeWasVisible(page: Page, markerKey: string): Promise<boolean> {
  return page.evaluate((key) => window.sessionStorage.getItem(key) === "true", markerKey);
}

export { NOTICE_SELECTOR };
