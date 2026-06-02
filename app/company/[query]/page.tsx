import { AnalysisClient } from "@/components/analysis-client";

export default async function CompanyPage({
  params
}: {
  params: Promise<{ query: string }>;
}) {
  const { query } = await params;
  return <AnalysisClient query={decodeURIComponent(query)} />;
}
