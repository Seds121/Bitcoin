import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { classifyQuery } from "@/lib/search";
import { shortHash } from "@/lib/format";
import { AddressView } from "@/views/AddressView";

type Props = { params: { address: string } };

function resolve(raw: string): string | null {
  const r = classifyQuery(decodeURIComponent(raw));
  return r.ok && r.kind === "address" ? r.value : null;
}

export function generateMetadata({ params }: Props): Metadata {
  const address = resolve(params.address);
  return { title: address ? `Address ${shortHash(address, 8, 6)}` : "Address" };
}

export default function AddressPage({ params }: Props) {
  const address = resolve(params.address);
  if (!address) notFound();
  return <AddressView address={address} />;
}
