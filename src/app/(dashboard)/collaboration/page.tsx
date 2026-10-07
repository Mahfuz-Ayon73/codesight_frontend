import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/utils/cookie";
import { organizationService } from "@/services/organization/organization.service";
import { projectService } from "@/services/project/project.service";
import CollaborationView, {
  type CollaborationOrganization,
} from "@/components/collaboration/CollaborationView";

export const dynamic = "force-dynamic";

/**
 * Collaboration is intentionally built from the same scoped project/member
 * endpoints used by the rest of the dashboard. This keeps invited users from
 * learning about projects outside their membership.
 */
export default async function CollaborationPage() {
  const token = (await cookies()).get(AUTH_TOKEN_COOKIE)?.value;
  if (!token) redirect("/login");

  const organizations = await organizationService.list(token).catch(() => []);
  const collaborationOrganizations: CollaborationOrganization[] = await Promise.all(
    organizations.map(async (organization) => {
      const projects = await projectService.list(token, organization.id).catch(() => []);
      const projectsWithMembers = await Promise.all(
        projects.map(async (project) => ({
          project,
          members: await projectService
            .listMembers(token, organization.id, project.id)
            .catch(() => []),
        }))
      );

      return { organization, projects: projectsWithMembers };
    })
  );

  return <CollaborationView organizations={collaborationOrganizations} />;
}
