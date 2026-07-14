import { NextRequest } from "next/server";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = "bob450572-a11y";
const REPO_NAME = "qzapmlqpwoeiruty";

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
    const repoRes = await githubApi(`/repos/${REPO_OWNER}/${REPO_NAME}`);
    if (!repoRes.ok) {
      const errText = await repoRes.text();
      return Response.json({ error: `Failed to get repo: ${errText}` }, { status: 500 });
    }
    const repo = await repoRes.json();

    const machineType = "basicLinux32Gb";

    const csRes = await githubApi("/user/codespaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repository_id: repo.id,
        machine_type: machineType,
        display_name: `vb-${Date.now().toString(36)}`,
        devcontainer_path: ".devcontainer/devcontainer.json",
        retention_period: 60,
      }),
    });

    if (!csRes.ok) {
      const errText = await csRes.text();
      return Response.json({ error: `Failed to create codespace: ${errText}` }, { status: 500 });
    }

    const cs = await csRes.json();
    return Response.json({
      codespaceName: cs.name,
      status: cs.state,
      displayName: cs.display_name,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!GITHUB_TOKEN) {
    return Response.json({ error: "GITHUB_TOKEN not configured" }, { status: 500 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return Response.json({ error: "Missing id parameter" }, { status: 400 });
  }

  try {
    const csRes = await githubApi(`/user/codespaces/${id}`);
    if (!csRes.ok) {
      if (csRes.status === 404) {
        return Response.json({ status: "deleted", tunnelUrl: null });
      }
      const errText = await csRes.text();
      return Response.json({ error: `Failed to get codespace: ${errText}` }, { status: 500 });
    }

    const cs = await csRes.json();
    const tunnelMatch = cs.description?.match(/TUNNEL:(https:\/\/\S+)/);
    const tunnelUrl = tunnelMatch ? tunnelMatch[1] : null;

    return Response.json({
      codespaceName: cs.name,
      status: cs.state,
      tunnelUrl,
      displayName: cs.display_name,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!GITHUB_TOKEN) {
    return Response.json({ error: "GITHUB_TOKEN not configured" }, { status: 500 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return Response.json({ error: "Missing id parameter" }, { status: 400 });
  }

  try {
    const csRes = await githubApi(`/user/codespaces/${id}`, {
      method: "DELETE",
    });

    if (!csRes.ok && csRes.status !== 404) {
      const errText = await csRes.text();
      return Response.json({ error: `Failed to delete codespace: ${errText}` }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg }, { status: 500 });
  }
}
