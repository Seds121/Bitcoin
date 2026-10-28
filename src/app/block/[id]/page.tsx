import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlockView } from "@/views/BlockView";

type Props = { params: { id: string } };

const isBlockId = (v: string) => /^\d{1,7}$/.test(v) || /^[a-fA-F0-9]{64}$/.test(v);

export function generateMetadata({ params }: Props): Metadata {
  return { title: /^\d+$/.test(params.id) ? `Block ${params.id}` : "Block" };
}

export default function BlockPage({ params }: Props) {
  if (!isBlockId(params.id)) notFound();
  return <BlockView id={params.id.toLowerCase()} />;
}
