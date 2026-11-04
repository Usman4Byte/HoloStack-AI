import { GuestProject } from "@/components/guest-project";
import { GuestWorkspaceShell } from "@/components/guest-workspace-shell";

export default async function GuestProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GuestWorkspaceShell projectId={id}><GuestProject id={id} /></GuestWorkspaceShell>;
}
