import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { organizationService } from "@/services/organization/organization.service";
import { projectService } from "@/services/project/project.service";
import CollaborationPage from "./page";
import type { Organization } from "@/types/organization/organization.schema";
import type { Project, ProjectMember } from "@/types/project/project.schema";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/services/organization/organization.service", () => ({
  organizationService: { list: vi.fn() },
}));
vi.mock("@/services/project/project.service", () => ({
  projectService: { list: vi.fn(), listMembers: vi.fn() },
}));

const cookiesMock = vi.mocked(cookies);
const redirectMock = vi.mocked(redirect);
const listOrganizationsMock = vi.mocked(organizationService.list);
const listProjectsMock = vi.mocked(projectService.list);
const listMembersMock = vi.mocked(projectService.listMembers);

describe("CollaborationPage", () => {
  beforeEach(() => {
    cookiesMock.mockResolvedValue(cookieStore("test-token"));
    redirectMock.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  it("redirects unauthenticated users to login", async () => {
    cookiesMock.mockResolvedValue(cookieStore(undefined));

    await expect(CollaborationPage()).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectMock).toHaveBeenCalledWith("/login");
    expect(listOrganizationsMock).not.toHaveBeenCalled();
  });

  it("loads every organization, its projects, and each project team", async () => {
    const user = userEvent.setup();
    const orgA = organization("org-a", "A1");
    const orgB = organization("org-b", "B1");
    const projectA = project("project-a", "org-a", "Compiler");
    const projectB = project("project-b", "org-b", "Runtime");
    listOrganizationsMock.mockResolvedValue([orgA, orgB]);
    listProjectsMock.mockImplementation(async (_token, organizationId) =>
      organizationId === "org-a" ? [projectA] : [projectB]
    );
    listMembersMock.mockImplementation(async (_token, _organizationId, projectId) =>
      projectId === "project-a"
        ? [member("ada", "Ada", "Lovelace")]
        : [member("grace", "Grace", "Hopper")]
    );

    render(await CollaborationPage());

    expect(listProjectsMock).toHaveBeenCalledTimes(2);
    expect(listMembersMock).toHaveBeenCalledWith("test-token", "org-a", "project-a");
    expect(listMembersMock).toHaveBeenCalledWith("test-token", "org-b", "project-b");
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "Organization" }), "org-b");
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
  });

  it("keeps the page usable when a project member request fails", async () => {
    listOrganizationsMock.mockResolvedValue([organization("org-a", "A1")]);
    listProjectsMock.mockResolvedValue([project("project-a", "org-a", "Compiler")]);
    listMembersMock.mockRejectedValue(new Error("backend unavailable"));

    render(await CollaborationPage());

    expect(screen.getByRole("heading", { name: "Compiler" })).toBeInTheDocument();
    expect(screen.getByText("No active members.")).toBeInTheDocument();
  });

  it("shows the organization empty state when organization loading fails", async () => {
    listOrganizationsMock.mockRejectedValue(new Error("backend unavailable"));

    render(await CollaborationPage());

    expect(screen.getByText("No organizations yet")).toBeInTheDocument();
  });
});

function cookieStore(token: string | undefined) {
  return {
    get: vi.fn(() => token ? { name: "codesight_token", value: token } : undefined),
  } as unknown as Awaited<ReturnType<typeof cookies>>;
}

function organization(id: string, name: string): Organization {
  return { id, name, myRole: "MEMBER" };
}

function project(id: string, organizationId: string, name: string): Project {
  return {
    id,
    organizationId,
    name,
    ownerId: "owner",
    sourceType: "LOCAL_ZIP",
    analysisStatus: "PENDING_UPLOAD",
  };
}

function member(id: string, firstName: string, lastName: string): ProjectMember {
  return {
    id,
    projectId: "project-a",
    userId: id,
    userEmail: `${id}@example.com`,
    userFirstName: firstName,
    userLastName: lastName,
    role: "MEMBER",
  };
}
