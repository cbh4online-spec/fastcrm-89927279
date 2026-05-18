import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, STATUS_TONE } from "../lib/collectionsFormat";
import type { CollectionStatus } from "../types/collections";

export function StatusBadge({ status }: { status: CollectionStatus }) {
  return <Badge variant={STATUS_TONE[status]}>{STATUS_LABELS[status]}</Badge>;
}
