import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { shortHash } from "@/lib/format";
import { TxView } from "@/views/TxView";

type Props = { params: { txid: string } };

const isTxid = (v: string) => /^[a-fA-F0-9]{64}$/.test(v);

export function generateMetadata({ params }: Props): Metadata {
  return { title: isTxid(params.txid) ? `Transaction ${shortHash(params.txid, 8, 6)}` : "Transaction" };
}

export default function TxPage({ params }: Props) {
  if (!isTxid(params.txid)) notFound();
  return <TxView txid={params.txid.toLowerCase()} />;
}
