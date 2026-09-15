import { notFound } from "next/navigation";
import { auth } from "@/auth";
import StayPlanner from "@/components/StayPlanner";
import { getStayData, getStayEligibilityForGroup } from "@/lib/stay";

export default async function AdminStayEditPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.isAdmin) notFound();
  const { id: rawId } = await params; const id = Number(rawId);
  if (!Number.isInteger(id)) notFound();
  const eligibility = await getStayEligibilityForGroup(id);
  if (!eligibility) notFound();
  const data = JSON.parse(JSON.stringify(await getStayData(eligibility)));
  return <StayPlanner initialData={data} firstName={null} apiBase={`/api/admin/stay/groups/${id}`} backHref="/admin/stay" heading="Edit Stay Plan" showRecommendations={false} />;
}
