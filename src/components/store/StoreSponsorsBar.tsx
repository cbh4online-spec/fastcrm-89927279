import { SponsorsShowcase } from "@/components/sponsors/SponsorsShowcase";

interface StoreSponsorsBarProps {
  workspaceId: string;
}

export function StoreSponsorsBar({ workspaceId }: StoreSponsorsBarProps) {
  return <SponsorsShowcase workspaceId={workspaceId} variant="bar" />;
}
