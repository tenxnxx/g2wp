import { ReportDetailClient } from "@/components/reports/report-detail-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReportDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <ReportDetailClient reportId={id} />;
}
