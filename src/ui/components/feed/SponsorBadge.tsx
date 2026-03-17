import React from "react";

import { StatusBadge } from "../../StatusBadge";

type Props = {
  isSponsored?: boolean | null;
};

export default function SponsorBadge({ isSponsored }: Props) {
  if (!isSponsored) return null;

  return <StatusBadge label="Sponsored" tone="sponsored" />;
}
