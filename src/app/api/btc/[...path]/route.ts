import { NextResponse } from "next/server";
import { isAllowedPath, revalidateSeconds } from "@/lib/proxy";
import { fetchUpstream } from "@/lib/upstream";

export async function GET(_req: Request, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");

  if (!isAllowedPath(path)) {
    return NextResponse.json({ error: "Unsupported request." }, { status: 400 });
  }

  const r = await fetchUpstream(path, revalidateSeconds(path));
  return new NextResponse(r.body, {
    status: r.status,
    headers: {
      "Content-Type": r.contentType,
      "X-Data-Source": r.source,
      "Cache-Control": r.status === 200 ? "public, s-maxage=20, stale-while-revalidate=60" : "no-store",
    },
  });
}
