import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@kandev/ui/tooltip";
import type { UseRemoteRepositoriesResult } from "@/hooks/domains/integrations/use-remote-repositories";
import type { Repository } from "@/lib/types/http";
import { RepositoryPicker } from "./task-create-dialog-repository-picker";

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

const workspaceRepository = {
  id: "repo-local",
  name: "local-app",
  local_path: "/work/local-app",
  default_branch: "main",
} as Repository;

function accessible(): UseRemoteRepositoriesResult {
  return {
    repos: [
      {
        provider: "github",
        id: "acme/remote-app",
        owner: "acme",
        name: "remote-app",
        fullName: "acme/remote-app",
        url: "https://github.com/acme/remote-app",
        defaultBranch: "main",
        private: false,
      },
    ],
    availableProviders: ["github"],
    providerCatalog: [{ provider: "github", readiness: "ready" }],
    loading: false,
    error: null,
    sourceErrors: [],
    unavailable: false,
    search: vi.fn(),
    matchesURL: () => false,
  };
}

function renderPicker(scopeKey?: string, provider: "github" | "gitlab" = "github") {
  const value = accessible();
  if (provider === "gitlab") {
    value.repos = [
      {
        ...value.repos[0],
        provider: "gitlab",
        url: "https://gitlab.com/acme/remote-app",
      },
    ];
    value.availableProviders = ["gitlab"];
    value.providerCatalog = [{ provider: "gitlab", readiness: "ready" }];
  }
  return render(
    <TooltipProvider>
      <RepositoryPicker
        repositories={[workspaceRepository]}
        discoveredRepositories={[]}
        accessible={value}
        onSelectLocal={vi.fn()}
        onSelectRemote={vi.fn()}
        onPasteRemote={vi.fn()}
        onRefresh={vi.fn()}
        scopeKey={scopeKey}
      />
    </TooltipProvider>,
  );
}

describe("RepositoryPicker", () => {
  it("renders named source tabs before the search field", () => {
    renderPicker();

    const tabs = screen.getByTestId("task-repository-source-tabs");
    const input = screen.getByTestId("task-repository-picker-input");
    expect(tabs.textContent).toContain("Local");
    expect(tabs.textContent).toContain("GitHub");
    expect(tabs.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("adds a selected repository from the active provider source", () => {
    const onSelectRemote = vi.fn();
    render(
      <TooltipProvider>
        <RepositoryPicker
          repositories={[]}
          discoveredRepositories={[]}
          accessible={accessible()}
          onSelectLocal={vi.fn()}
          onSelectRemote={onSelectRemote}
          onPasteRemote={vi.fn()}
          onRefresh={vi.fn()}
        />
      </TooltipProvider>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "GitHub" }));
    fireEvent.click(screen.getByTestId("task-repository-remote-option"));
    expect(onSelectRemote).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: "acme/remote-app" }),
    );
  });

  it("includes the local repository default branch when selected", () => {
    const onSelectLocal = vi.fn();
    render(
      <TooltipProvider>
        <RepositoryPicker
          repositories={[workspaceRepository]}
          discoveredRepositories={[]}
          accessible={accessible()}
          onSelectLocal={onSelectLocal}
          onSelectRemote={vi.fn()}
          onPasteRemote={vi.fn()}
          onRefresh={vi.fn()}
        />
      </TooltipProvider>,
    );

    fireEvent.click(screen.getByTestId("task-repository-local-option"));

    expect(onSelectLocal).toHaveBeenCalledWith({
      repositoryId: "repo-local",
      defaultBranch: "main",
    });
  });

  it("offers local repository creation when the caller provides it", () => {
    const onCreateRepository = vi.fn();
    render(
      <TooltipProvider>
        <RepositoryPicker
          repositories={[workspaceRepository]}
          discoveredRepositories={[]}
          accessible={accessible()}
          onSelectLocal={vi.fn()}
          onSelectRemote={vi.fn()}
          onPasteRemote={vi.fn()}
          onRefresh={vi.fn()}
          onCreateRepository={onCreateRepository}
        />
      </TooltipProvider>,
    );

    fireEvent.click(screen.getByTestId("create-local-repository-button"));

    expect(onCreateRepository).toHaveBeenCalledOnce();
  });

  it("restores the last eligible provider for the picker scope", () => {
    sessionStorage.setItem("kandev.task-repository-picker-source:workspace-1", "gitlab");
    renderPicker("workspace-1", "gitlab");

    expect(screen.getByRole("tab", { name: "GitLab" }).getAttribute("aria-selected")).toBe("true");
  });
});

describe("RepositoryPicker local source filtering", () => {
  it("excludes provider-only saved repositories but keeps a local checkout with provider metadata", () => {
    const onSelectLocal = vi.fn();
    const localProviderRepository = {
      ...workspaceRepository,
      id: "repo-local-provider",
      name: "local-provider-app",
      source_type: "provider",
      provider: "bitbucket",
    } as Repository;
    const remoteOnlyRepository = {
      ...workspaceRepository,
      id: "repo-remote-only",
      name: "remote-only-app",
      local_path: "",
      source_type: "provider",
      provider: "bitbucket",
    } as Repository;

    render(
      <TooltipProvider>
        <RepositoryPicker
          repositories={[localProviderRepository, remoteOnlyRepository]}
          discoveredRepositories={[]}
          accessible={accessible()}
          onSelectLocal={onSelectLocal}
          onSelectRemote={vi.fn()}
          onPasteRemote={vi.fn()}
          onRefresh={vi.fn()}
        />
      </TooltipProvider>,
    );

    expect(screen.getAllByTestId("task-repository-local-option")).toHaveLength(1);
    expect(screen.getByText("local-provider-app")).toBeTruthy();
    expect(screen.queryByText("remote-only-app")).toBeNull();
    fireEvent.click(screen.getByTestId("task-repository-local-option"));
    expect(onSelectLocal).toHaveBeenCalledWith(
      expect.objectContaining({ repositoryId: "repo-local-provider" }),
    );
  });
});
