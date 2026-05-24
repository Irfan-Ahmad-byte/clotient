import { ClotientCollection, ClotientRequest, ClotientCollectionFolder, KeyValue } from "../types";

// Helper to generate simple alphanumeric unique IDs
const uuid = () => Math.random().toString(36).substring(2, 11);

/**
 * Parses a Postman Collection (v2 or v2.1) JSON into the native ClotientCollection structure.
 */
export function importPostmanCollection(jsonString: string): ClotientCollection {
  const data = JSON.parse(jsonString);
  const info = data.info || {};
  const collectionName = info.name || "Imported Collection";
  const description = info.description || "";

  const requests: ClotientRequest[] = [];
  const folders: ClotientCollectionFolder[] = [];

  const parseItem = (item: any, currentFolder?: ClotientCollectionFolder) => {
    if (!item) return;

    if (Array.isArray(item.item)) {
      // Create a folder
      const folder: ClotientCollectionFolder = {
        id: uuid(),
        name: item.name || "New Folder",
        requests: []
      };
      folders.push(folder);

      // Recurse into children of folder
      item.item.forEach((child: any) => parseItem(child, folder));
    } else if (item.request) {
      // It's a request
      const req = parsePostmanRequest(item);
      if (currentFolder) {
        currentFolder.requests.push(req);
      } else {
        requests.push(req);
      }
    }
  };

  if (Array.isArray(data.item)) {
    data.item.forEach((item: any) => parseItem(item));
  }

  return {
    id: uuid(),
    name: collectionName,
    description,
    requests,
    folders: folders.filter((f) => f.requests.length > 0), // Filter out empty folders
  };
}

/**
 * Maps a single Postman Request item to ClotientRequest.
 */
function parsePostmanRequest(item: any): ClotientRequest {
  const postmanReq = item.request;
  const method = (postmanReq.method || "GET").toUpperCase() as any;

  // URL parsing
  let url = "";
  if (typeof postmanReq.url === "string") {
    url = postmanReq.url;
  } else if (postmanReq.url && postmanReq.url.raw) {
    url = postmanReq.url.raw;
  }

  // Headers mapping
  const headers: KeyValue[] = [];
  if (Array.isArray(postmanReq.header)) {
    postmanReq.header.forEach((h: any) => {
      headers.push({
        id: uuid(),
        key: h.key || "",
        value: h.value || "",
        enabled: h.disabled !== true,
        description: h.description || "",
      });
    });
  }

  // Parameters mapping
  const params: KeyValue[] = [];
  if (postmanReq.url && Array.isArray(postmanReq.url.query)) {
    postmanReq.url.query.forEach((q: any) => {
      params.push({
        id: uuid(),
        key: q.key || "",
        value: q.value || "",
        enabled: q.disabled !== true,
        description: q.description || "",
      });
    });
  }

  // Body mapping
  const body: ClotientRequest["body"] = { type: "none" };
  if (postmanReq.body) {
    const mode = postmanReq.body.mode;
    if (mode === "raw") {
      body.type = "json"; // Default raw payloads to json for formatting
      body.rawText = postmanReq.body.raw || "";
    } else if (mode === "urlencoded" && Array.isArray(postmanReq.body.urlencoded)) {
      body.type = "urlencoded";
      body.urlencoded = postmanReq.body.urlencoded.map((x: any) => ({
        id: uuid(),
        key: x.key || "",
        value: x.value || "",
        enabled: x.disabled !== true,
      }));
    } else if (mode === "formdata" && Array.isArray(postmanReq.body.formdata)) {
      body.type = "form-data";
      body.formData = postmanReq.body.formdata.map((x: any) => ({
        id: uuid(),
        key: x.key || "",
        value: x.value || "",
        enabled: x.disabled !== true,
      }));
    }
  }

  // Pre-request and Post-request script mapping
  let preRequest = "";
  let postRequest = "";
  if (Array.isArray(item.event)) {
    item.event.forEach((ev: any) => {
      if (ev.listen === "prerequest" && ev.script && Array.isArray(ev.script.exec)) {
        preRequest = ev.script.exec.join("\n");
      } else if (ev.listen === "test" && ev.script && Array.isArray(ev.script.exec)) {
        postRequest = ev.script.exec.join("\n");
      }
    });
  }

  // Auth mapping
  let authType: ClotientRequest["auth"]["type"] = "none";
  let bearerToken = "";
  let basicUsername = "";
  let basicPassword = "";

  if (postmanReq.auth) {
    const type = postmanReq.auth.type;
    if (type === "bearer" && Array.isArray(postmanReq.auth.bearer)) {
      authType = "bearer";
      const tokenObj = postmanReq.auth.bearer.find((b: any) => b.key === "token");
      if (tokenObj) bearerToken = tokenObj.value || "";
    } else if (type === "basic" && Array.isArray(postmanReq.auth.basic)) {
      authType = "basic";
      const uObj = postmanReq.auth.basic.find((b: any) => b.key === "username");
      const pObj = postmanReq.auth.basic.find((b: any) => b.key === "password");
      if (uObj) basicUsername = uObj.value || "";
      if (pObj) basicPassword = pObj.value || "";
    }
  }

  return {
    id: uuid(),
    name: item.name || "Untitled Request",
    method,
    url,
    headers,
    params,
    body,
    scripts: { preRequest, postRequest },
    auth: {
      type: authType,
      bearerToken,
      basicUsername,
      basicPassword,
    },
  };
}

/**
 * Exports a ClotientCollection structure into Postman Collection v2.1.0 compatible JSON string.
 */
export function exportToPostmanCollection(collection: ClotientCollection): string {
  const postmanItems: any[] = [];

  const mapRequestToPostmanItem = (req: ClotientRequest) => {
    // Auth structure
    let auth: any = undefined;
    if (req.auth.type === "bearer") {
      auth = {
        type: "bearer",
        bearer: [{ key: "token", value: req.auth.bearerToken, type: "string" }],
      };
    } else if (req.auth.type === "basic") {
      auth = {
        type: "basic",
        basic: [
          { key: "username", value: req.auth.basicUsername, type: "string" },
          { key: "password", value: req.auth.basicPassword, type: "string" },
        ],
      };
    }

    // Body structure
    let body: any = undefined;
    if (req.body.type === "json" || req.body.type === "raw") {
      body = {
        mode: "raw",
        raw: req.body.rawText || "",
        options: { raw: { language: req.body.type === "json" ? "json" : "text" } },
      };
    } else if (req.body.type === "urlencoded") {
      body = {
        mode: "urlencoded",
        urlencoded: (req.body.urlencoded || []).map((x) => ({
          key: x.key,
          value: x.value,
          disabled: !x.enabled,
        })),
      };
    } else if (req.body.type === "form-data") {
      body = {
        mode: "formdata",
        formdata: (req.body.formData || []).map((x) => ({
          key: x.key,
          value: x.value,
          type: "text",
          disabled: !x.enabled,
        })),
      };
    }

    // Scripts structure
    const event: any[] = [];
    if (req.scripts.preRequest) {
      event.push({
        listen: "prerequest",
        script: {
          exec: req.scripts.preRequest.split("\n"),
          type: "text/javascript",
        },
      });
    }
    if (req.scripts.postRequest) {
      event.push({
        listen: "test",
        script: {
          exec: req.scripts.postRequest.split("\n"),
          type: "text/javascript",
        },
      });
    }

    return {
      name: req.name,
      event: event.length > 0 ? event : undefined,
      request: {
        method: req.method,
        header: req.headers.map((h) => ({
          key: h.key,
          value: h.value,
          description: h.description,
          disabled: !h.enabled,
        })),
        body,
        url: {
          raw: req.url,
          query: req.params.map((p) => ({
            key: p.key,
            value: p.value,
            description: p.description,
            disabled: !p.enabled,
          })),
        },
        auth,
      },
    };
  };

  // Add top-level requests
  collection.requests.forEach((req) => {
    postmanItems.push(mapRequestToPostmanItem(req));
  });

  // Add folders
  collection.folders.forEach((folder) => {
    postmanItems.push({
      name: folder.name,
      item: folder.requests.map(mapRequestToPostmanItem),
    });
  });

  const postmanDoc = {
    info: {
      _postman_id: collection.id,
      name: collection.name,
      description: collection.description || "",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: postmanItems,
  };

  return JSON.stringify(postmanDoc, null, 2);
}
