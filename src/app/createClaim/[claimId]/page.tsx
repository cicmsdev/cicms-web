import CreateOrUpdateClaimPage from "../../../../components/user/contractorDashbord/CreateClaim";


type PageProps = { params: { claimId: string } };

export default function Page({ params }: PageProps) {
  return (
    <main>
      <CreateOrUpdateClaimPage claimId={params.claimId} />
    </main>
  );
}