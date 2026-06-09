import config from "./config.js";
import fs from "fs";
import path from "path";

export const getChannels = () => {
  if (process.env.CHANNELS_DATA) {
    try {
      const envData = JSON.parse(process.env.CHANNELS_DATA);
      if (Array.isArray(envData) && envData.length > 0) return envData;
    } catch (e) {
      console.warn("CHANNELS_DATA parse failed:", e.message);
    }
  }
  try {
    const localPath = path.join(process.cwd(), "public", "channels.json");
    if (fs.existsSync(localPath)) {
      let raw = JSON.parse(fs.readFileSync(localPath, "utf8"));
      raw = raw.map((g) => ({
        ...g,
        channels: (g.channels || []).map((ch) => normalizeChannel(ch)),
      }));
      return raw;
    }
  } catch (e) {
    console.error("Local file read failed:", e);
  }
  return [];
};

export const normalizeChannel = (ch) => {
  let urls = [];
  if (Array.isArray(ch.url)) {
    urls = ch.url
      .map((u) => {
        if (typeof u === "string") return { url: u, note: "" };
        if (typeof u === "object" && u.url)
          return { url: u.url, note: u.note || "" };
        return null;
      })
      .filter(Boolean);
  } else if (typeof ch.url === "string" && ch.url) {
    urls = [{ url: ch.url, note: "" }];
  }
  return { ...ch, url: urls };
};

export const buildLogoUrl = (logoId) => {
  if (!logoId) return "/jptv.png";
  if (logoId.startsWith("http")) return logoId;
  return config.logoBaseUrl + logoId + ".png";
};

export const formatAsM3U = (groups) => {
  let m3u = "#EXTM3U\n";
  groups.forEach((g) => {
    (g.channels || []).forEach((ch) => {
      const urls = Array.isArray(ch.url) ? ch.url : [ch.url];
      urls.forEach((u) => {
        const url = typeof u === "string" ? u : u.url || "";
        if (!url) return;
        const logo = buildLogoUrl(ch.logo);
        const tvgId = ch.id || ch.name || "";
        m3u +=
          '#EXTINF:-1 tvg-id="' + tvgId + '" tvg-name="' + ch.name + '" tvg-logo="' + logo + '" group-title="' + g.group + '",' + ch.name + "\n" + url + "\n";
      });
    });
  });
  return m3u;
};

export const formatAsTXT = (groups) => {
  let txt = "";
  groups.forEach((g) => {
    txt += g.group + ",#genre#\n";
    (g.channels || []).forEach((ch) => {
      const urls = Array.isArray(ch.url) ? ch.url : [ch.url];
      urls.forEach((u) => {
        const url = typeof u === "string" ? u : u.url || "";
        if (!url) return;
        txt += ch.name + "," + url + "\n";
      });
    });
    txt += "\n";
  });
  return txt;
};

export const parseM3U = (content) => {
  const lines = content.split("\n");
  const groups = {};
  let currentGroup = '\u672a\u5206\u7ec4';
  let currentExtinf = null;
  lines.forEach((line) => {
    line = line.trim();
    if (!line) return;
    if (line.startsWith("#EXTINF:")) {
      currentExtinf = line;
      const groupMatch = line.match(/group-title="([^"]*)"/);
      if (groupMatch) currentGroup = groupMatch[1] || '\u672a\u5206\u7ec4';
    } else if (!line.startsWith("#")) {
      const url = line;
      if (currentExtinf) {
        const nameMatch = currentExtinf.match(/,([^,]+)$/);
        const name = nameMatch ? nameMatch[1].trim() : '\u672a\u77e5';
        const logoMatch = currentExtinf.match(/tvg-logo="([^"]*)"/);
        const logo = logoMatch ? logoMatch[1] : "";
        const idMatch = currentExtinf.match(/tvg-id="([^"]*)"/);
        const id = idMatch ? idMatch[1] : "";
        if (!groups[currentGroup]) groups[currentGroup] = [];
        let channel = groups[currentGroup].find((c) => c.name === name);
        if (channel) {
          channel.url.push({ url, note: "" });
        } else {
          groups[currentGroup].push({ name, id, logo, url: [{ url, note: "" }] });
        }
        currentExtinf = null;
      }
    }
  });
  return Object.entries(groups).map(([group, channels]) => ({ group, channels }));
};

export const parseTXT = (content) => {
  const lines = content.split("\n");
  const groups = [];
  let currentGroup = null;
  lines.forEach((line) => {
    line = line.trim();
    if (!line) return;
    if (line.endsWith(",#genre#")) {
      currentGroup = line.replace(",#genre#", "").trim();
      groups.push({ group: currentGroup, channels: [] });
    } else if (line.includes(",")) {
      const splitIdx = line.indexOf(",");
      const name = line.substring(0, splitIdx).trim();
      const url = line.substring(splitIdx + 1).trim();
      if (name && url) {
        if (!groups.length) {
          groups.push({ group: '\u672a\u5206\u7ec4', channels: [] });
          currentGroup = '\u672a\u5206\u7ec4';
        }
        const g = groups[groups.length - 1];
        if (g.group === currentGroup) {
          g.channels.push({ name, id: name, logo: "", url: [{ url, note: "" }] });
        }
      }
    }
  });
  return groups;
};

export const parseJSON = (content) => {
  const data = JSON.parse(content);
  if (Array.isArray(data)) {
    return data.map((g) => ({
      group: g.group || '\u672a\u5206\u7ec4',
      channels: (g.channels || []).map((ch) => normalizeChannel(ch)),
    }));
  }
  if (data.group || data.channels) {
    return [{
      group: data.group || '\u672a\u5206\u7ec4',
      channels: (data.channels || []).map((ch) => normalizeChannel(ch)),
    }];
  }
  return [];
};
