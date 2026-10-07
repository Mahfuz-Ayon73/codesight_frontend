import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import CollaborationView, { type CollaborationOrganization } from "./CollaborationView";
import type { Project, ProjectMember } from "@/types/project/project.schema";

describe("CollaborationView", () => {
  it("shows the first organization and switches project teams", async () => {
    const user = userEvent.setup();
    render(<CollaborationView organizations={organizations()} />);

    expect(screen.getByRole("combobox", { name: "Organization" })).toHaveValue("org-a");
    expect(screen.getByRole("heading", { name: "Compiler" })).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Runtime" })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "Organization" }), "org-b");

    expect(screen.getByRole("heading", { name: "Runtime" })).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Compiler" })).not.toBeInTheDocument();
  });

  it("renders project and active-membership totals", () => {
    render(<CollaborationView organizations={organizations()} />);

    expect(textContent("1 project")).toBeInTheDocument();
    expect(textContent("2 active memberships")).toBeInTheDocument();
    expect(textContent("2 members")).toBeInTheDocument();
    expect(screen.getByText("OWNER")).toBeInTheDocument();
    expect(screen.getByText("MEMBER")).toBeInTheDocument();
  });

  it("shows an organization-level empty state", () => {
    render(<CollaborationView organizations={[]} />);

    expect(screen.getByText("No organizations yet")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("shows an empty state when the selected organization has no projects", () => {
    const data = organizations();
    data[0].projects = [];

    render(<CollaborationView organizations={data} />);

    expect(screen.getByText("No projects to show")).toBeInTheDocument();
    expect(textContent("0 projects")).toBeInTheDocument();
  });

  it("shows project and member fallbacks", () => {
    const data = organizations();
    data[0].projects[0].members = [
      member("unknown", "", "", "", "VIEWER"),
    ];

    render(<CollaborationView organizations={data} />);

    expect(screen.getByText("Unknown member")).toBeInTheDocument();
    expect(screen.getByText("?")).toBeInTheDocument();
    expect(screen.getByText("VIEWER")).toBeInTheDocument();
  });

  it("shows a project with no active members", () => {
    const data = organizations();
    data[0].projects[0].members = [];

    render(<CollaborationView organizations={data} />);

    expect(screen.getByText("No active members.")).toBeInTheDocument();
    expect(textContent("0 active memberships")).toBeInTheDocument();
  });
});

function textContent(value: string) {
  return screen.getByText((_content, element) => element?.textContent === value);
}

function organizations(): CollaborationOrganization[] {
  return [
    {
      organization: { id: "org-a", name: "A1", myRole: "OWNER" },
      projects: [{
        project: project("project-a", "org-a", "Compiler"),
        members: [
          member("ada", "Ada", "Lovelace", "ada@example.com", "OWNER"),
          member("alan", "Alan", "Turing", "alan@example.com", "MEMBER"),
        ],
      }],
    },
    {
      organization: { id: "org-b", name: "B1", myRole: "MEMBER" },
      projects: [{
        project: project("project-b", "org-b", "Runtime"),
        members: [member("grace", "Grace", "Hopper", "grace@example.com", "ADMIN")],
      }],
    },
  ];
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

function member(
  id: string,
  firstName: string,
  lastName: string,
  email: string,
  role: ProjectMember["role"]
): ProjectMember {
  return {
    id,
    projectId: "project-a",
    userId: id,
    userFirstName: firstName,
    userLastName: lastName,
    userEmail: email,
    role,
  };
}
