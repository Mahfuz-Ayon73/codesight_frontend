"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// useDomainValidation — triggers the on-demand LLM domain-validation pass
// (POST /api/project/validate-domains) and refreshes the page so the server
// component re-fetches the blueprint with the new domain_llm_* fields.
//
// Domain validation used to run inline during analysis; it's now a separate
// action so the main result shows immediately and this only runs when a user
// actually asks for it.
// ---------------------------------------------------------------------------

interface ValidateDomainsResult {
  success: boolean;
  llmConfigured?: boolean;
  clustersChecked?: number;
  clustersConfirmed?: number;
  clustersWithSuggestions?: number;
  errorMessage?: string;
}

export function useDomainValidation(orgId: string | undefined, projectId: string) {
  const router = useRouter();
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ValidateDomainsResult | null>(null);

  const validate = useCallback(async () => {
    if (!orgId || validating) return;
    setValidating(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/project/validate-domains?organizationId=${orgId}&projectId=${projectId}`,
        { method: "POST" }
      );
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        setError(body?.error_message ?? body?.message ?? "Domain validation failed.");
        setLastResult(body ? { success: false, errorMessage: body.error_message } : null);
        return;
      }
      setLastResult({
        success: true,
        llmConfigured: body.llm_configured,
        clustersChecked: body.clusters_checked,
        clustersConfirmed: body.clusters_confirmed,
        clustersWithSuggestions: body.clusters_with_suggestions,
      });
      if (body.llm_configured === false) {
        setError("No LLM provider is configured on the analysis service.");
        return;
      }
      // Blueprint is re-fetched server-side (page is force-dynamic), so this
      // is enough to bring the new domain_llm_* fields into every client
      // component below it without any local state surgery.
      router.refresh();
    } catch {
      setError("Domain validation failed.");
    } finally {
      setValidating(false);
    }
  }, [orgId, projectId, validating, router]);

  return { validate, validating, error, lastResult };
}
