import { cookies } from "next/headers";
import Navbar from "@/components/navbar/navbar";
import Sidebar from "@/components/sidebar/sidebar";
import { getProfileAction } from "@/actions/user.action";
import { listOrganizationsAction } from "@/actions/organization.action";
import { SKIPPED_ORG_SETUP_COOKIE } from "@/utils/cookie";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Fetched here, once per render, and passed down — the switcher and sidebar
  // used to each fetch this from a client effect keyed on the pathname, which
  // meant a Server Action round-trip on every navigation and a list that went
  // stale the moment membership changed without a navigation (e.g. leaving an
  // org). Rendering it in the layout means router.refresh() alone is enough to
  // bring both back in sync.
  const [user, organizations, cookieStore] = await Promise.all([
    getProfileAction().catch(() => null),
    listOrganizationsAction().catch(() => []),
    cookies(),
  ]);
  // Read here rather than in the (client) sidebar: reading document.cookie
  // during render would disagree with the server's HTML and blow up hydration.
  const skippedOrgSetup = !!cookieStore.get(SKIPPED_ORG_SETUP_COOKIE)?.value;

  return (
    <div className="min-h-screen">
      {/* Fixed navbar */}
      <header className="fixed top-0 left-0 right-0 z-30 h-14">
        <Navbar user={user} organizations={organizations} />
      </header>

      {/* Fixed sidebar */}
      <aside className="fixed top-14 left-0 bottom-0 z-20 w-52">
        <Sidebar organizations={organizations} skippedOrgSetup={skippedOrgSetup} />
      </aside>

      {/* Scrollable content — offset by navbar height and sidebar width */}
      <main className="pt-14 pl-52 min-h-screen bg-white">
        <div className="p-6 pb-12">
          {children}
        </div>
      </main>
    </div>
  );
}
