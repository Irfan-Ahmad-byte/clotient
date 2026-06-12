const GITHUB_REPO = "Clottis/clotient";

function formatBytes(bytes) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function selectMacDmg(assets) {
  const dmgs = assets.filter((a) => a.name.toLowerCase().endsWith(".dmg"));
  if (dmgs.length === 0) return null;

  return (
    dmgs.find((a) => /universal/i.test(a.name)) ||
    dmgs.find((a) => /aarch64|arm64/i.test(a.name)) ||
    dmgs.find((a) => /x64|x86_64|amd64/i.test(a.name)) ||
    dmgs[0]
  );
}

async function initDownloadButton() {
  const btn = document.getElementById("download-macos");
  const versionEl = document.getElementById("latest-version");
  const statusEl = document.getElementById("download-status");

  if (!btn || !versionEl || !statusEl) return;

  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}`);
    }

    const release = await response.json();
    const dmg = selectMacDmg(release.assets || []);

    versionEl.textContent = release.tag_name;

    if (dmg) {
      btn.href = dmg.browser_download_url;
      btn.setAttribute("download", dmg.name);
      statusEl.textContent = `${dmg.name} · ${formatBytes(dmg.size)}`;
    } else {
      btn.href = release.html_url;
      statusEl.textContent = "No macOS DMG found — open release page";
    }

    btn.classList.remove("disabled");
    btn.classList.add("ready");
  } catch {
    versionEl.textContent = "Latest";
    btn.href = `https://github.com/${GITHUB_REPO}/releases/latest`;
    statusEl.textContent = "Could not fetch release — opening GitHub releases";
    btn.classList.remove("disabled");
    btn.classList.add("ready");
  }
}

initDownloadButton();
