import CreateOrUpdateClaimPage from "../../../../../components/user/contractorDashbord/CreateClaim";

export default function Page({ params }: { params: { claimId: string } }) {
  return <CreateOrUpdateClaimPage claimId={params.claimId} />;
}
