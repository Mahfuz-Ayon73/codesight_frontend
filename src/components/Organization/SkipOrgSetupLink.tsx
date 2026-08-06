"use client";

import { useRouter } from "next/navigation";
import { skipOrganizationSetup } from "@/utils/cookie";

type Props = {
  /** Where to go after skipping. Defaults to the workspace root. */
  href?: string;
  className?: string;
  children?: React.ReactNode;
};

/**
 * "Skip for now" on any create-organization step.
 *
 * Deliberately a button that records the skip and *then* navigates, not a
 * plain <Link>: the destination ("/") resolves an organization server-side and
 * hands off to this very form when there is none, so a bare link put the user
 * in a loop between the form and itself. The cookie is what tells those
 * redirectors the user opted out.
 */
export default function SkipOrgSetupLink({ href = "/", className, children = "Skip for now" }: Props) {
  const router = useRouter();

  function handleSkip() {
    // Set first, navigate second: the destination renders on the server and
    // must already see the skip. No router.refresh() chaser — the destinations
    // are force-dynamic, and a refresh racing a push is what has bounced this
    // app between routes before.
    skipOrganizationSetup();
    router.push(href);
  }

  return (
    <button type="button" onClick={handleSkip} className={className}>
      {children}
    </button>
  );
}
