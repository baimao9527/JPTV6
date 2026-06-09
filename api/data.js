import { getChannels, formatAsM3U, formatAsTXT, parseM3U, parseTXT, normalizeChannel, parseJSON } from "../utils/helpers.js";
import config from "../utils/config.js";

export default async function handler(req, res) {
  const { method, query } = req;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (method === "OPTIONS") return res.status(200).end();

  const token = query.token || "";
  const isAuth = token === config.adminToken;

  // Handle POST - save data (requires auth)
  if (method === "POST") {
    if (!isAuth) return res.status(401).json({ error: "Unauthorized" });

    let { newData } = req.body;
    if (Array.isArray(newData)) {
      newData = newData.map((g) => ({
        ...g,
        channels: (g.channels || [])
          .map((ch) => normalizeChannel(ch))
          .filter((ch) => ch.name && ch.name.trim() && ch.url.length > 0),
      })).filter((g) => g.group && g.group.trim());
    }

    const { projectId, token: vToken } = config.platform;
    if (!projectId || !vToken) {
      return res.status(500).json({ error: "Vercel env not configured" });
    }

    try {
      const headers = {
        Authorization: "Bearer " + vToken,
        "Content-Type": "application/json",
      };

      const listRes = await fetch(
        "https://api.vercel.com/v9/projects/" + projectId + "/env",
        { headers }
      );
      const listData = await listRes.json();
      const targetIds = (listData.envs || [])
        .filter((e) => e.key === "CHANNELS_DATA")
        .map((e) => e.id);

      for (const id of targetIds) {
        await fetch(
          "https://api.vercel.com/v9/projects/" + projectId + "/env/" + id,
          { method: "DELETE", headers }
        );
      }

      await fetch("https://api.vercel.com/v10/projects/" + projectId + "/env", {
        method: "POST",
        headers,
        body: JSON.stringify({
          key: "CHANNELS_DATA",
          value: JSON.stringify(newData),
          type: "encrypted",
          target: ["production", "preview", "development"],
        }),
      });

      return res.json({ success: true, message: "Data saved. Deploy triggered." });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // GET - return data or export
  let channels = [];
  try {
    channels = getChannels();
  } catch (e) {
    console.error("Data load error:", e);
  }

  const exp = query.export;

  if (exp === "m3u") {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(200).send(formatAsM3U(channels));
  }

  if (exp === "txt") {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(200).send(formatAsTXT(channels));
  }

  if (exp === "json") {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(200).send(JSON.stringify(channels, null, 2));
  }

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(200).json(channels);
}
