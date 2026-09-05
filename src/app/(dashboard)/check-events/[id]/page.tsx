import { CheckEventDetailClient } from "@/components/check-events/check-event-detail-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CheckEventDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <CheckEventDetailClient eventId={id} />;
}
