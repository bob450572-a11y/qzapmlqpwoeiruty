import { NextRequest } from "next/server";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

async function githubApi(path: string, options: RequestInit = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "virtual-browser-worker",
      ...options.headers,
    },
  });
  return res;
}

export async function POST(req: NextRequest) {
  if (!GITHUB_TOKEN) {
    return Response.json({ error: "GITHUB_TOKEN not configured" }, { status: 500 });
  }

  try {
    const { codespaceName, tunnelUrl } = await req.json();

    if (!codespaceName || !tunnelUrl) {
      return Response.json({ error: "Missing codespaceName or tunnelUrl" }, { status: 400 });
    }

    const patchRes = await githubApi(`/user/codespaces/${codespaceName}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: `TUNNEL:${tunnelUrl}`,
      }),
    });

    if (!patchRes.ok) {
      const errText = await patchRes.text();
      return Response.json({ error: `Failed to update codespace: ${errText}` }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg }, { status: 500 });
  }
}
