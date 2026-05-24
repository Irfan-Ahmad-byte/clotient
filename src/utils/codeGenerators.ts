import { ClotientRequest, KeyValue } from "../types";

export function generateCurl(
  request: ClotientRequest,
  resolvedUrl: string,
  resolvedHeaders: KeyValue[],
  bodyText?: string
): string {
  let cmd = `curl -X ${request.method} "${resolvedUrl}"`;
  resolvedHeaders
    .filter((h) => h.enabled && h.key)
    .forEach((h) => {
      cmd += ` \\\n  -H "${h.key}: ${h.value}"`;
    });
  if (request.body.type !== "none" && bodyText) {
    cmd += ` \\\n  -d '${bodyText.replace(/'/g, "'\\''")}'`;
  }
  return cmd;
}

export function generatePythonRequests(
  request: ClotientRequest,
  resolvedUrl: string,
  resolvedHeaders: KeyValue[],
  bodyText?: string
): string {
  let code = `import requests\n\n`;
  code += `url = "${resolvedUrl}"\n`;

  // Headers dictionary
  const activeHeaders = resolvedHeaders.filter((h) => h.enabled && h.key);
  if (activeHeaders.length > 0) {
    code += `headers = {\n`;
    activeHeaders.forEach((h) => {
      code += `    "${h.key}": "${h.value}",\n`;
    });
    code += `}\n\n`;
  } else {
    code += `headers = {}\n\n`;
  }

  if (request.body.type === "json" && bodyText) {
    code += `data = ${bodyText}\n`;
    code += `response = requests.${request.method.toLowerCase()}(url, headers=headers, json=data)\n`;
  } else if (request.body.type !== "none" && bodyText) {
    code += `data = """${bodyText}"""\n`;
    code += `response = requests.${request.method.toLowerCase()}(url, headers=headers, data=data)\n`;
  } else {
    code += `response = requests.${request.method.toLowerCase()}(url, headers=headers)\n`;
  }
  code += `\nprint(response.status_code)\nprint(response.text)\n`;
  return code;
}

export function generatePythonHttpClient(
  request: ClotientRequest,
  resolvedUrl: string,
  resolvedHeaders: KeyValue[],
  bodyText?: string
): string {
  let host = "";
  let path = "/";
  try {
    const urlObj = new URL(resolvedUrl);
    host = urlObj.host;
    path = urlObj.pathname + urlObj.search;
  } catch {
    host = "api.example.com";
    path = resolvedUrl;
  }

  let code = `import http.client\n\n`;
  code += `conn = http.client.HTTPSConnection("${host}")\n`;

  if (request.body.type !== "none" && bodyText) {
    code += `payload = """${bodyText}"""\n`;
  } else {
    code += `payload = ""\n`;
  }

  const activeHeaders = resolvedHeaders.filter((h) => h.enabled && h.key);
  code += `headers = {\n`;
  activeHeaders.forEach((h) => {
    code += `    '${h.key}': "${h.value}",\n`;
  });
  code += `}\n\n`;

  code += `conn.request("${request.method}", "${path}", payload, headers)\n`;
  code += `res = conn.getresponse()\n`;
  code += `data = res.read()\n`;
  code += `print(data.decode("utf-8"))\n`;
  return code;
}

export function generateJsAxios(
  request: ClotientRequest,
  resolvedUrl: string,
  resolvedHeaders: KeyValue[],
  bodyText?: string
): string {
  let code = `import axios from 'axios';\n\n`;
  code += `let config = {\n`;
  code += `  method: '${request.method.toLowerCase()}',\n`;
  code += `  url: '${resolvedUrl}',\n`;

  const activeHeaders = resolvedHeaders.filter((h) => h.enabled && h.key);
  if (activeHeaders.length > 0) {
    code += `  headers: {\n`;
    activeHeaders.forEach((h) => {
      code += `    '${h.key}': '${h.value}',\n`;
    });
    code += `  },\n`;
  }

  if (request.body.type !== "none" && bodyText) {
    if (request.body.type === "json") {
      code += `  data: ${bodyText}\n`;
    } else {
      code += `  data: '${bodyText.replace(/'/g, "\\'")}'\n`;
    }
  }

  code += `};\n\n`;
  code += `axios(config)\n`;
  code += `  .then((response) => {\n`;
  code += `    console.log(JSON.stringify(response.data));\n`;
  code += `  })\n`;
  code += `  .catch((error) => {\n`;
  code += `    console.log(error);\n`;
  code += `  });\n`;
  return code;
}

export function generateJsFetch(
  request: ClotientRequest,
  resolvedUrl: string,
  resolvedHeaders: KeyValue[],
  bodyText?: string
): string {
  let code = `let myHeaders = new Headers();\n`;
  resolvedHeaders
    .filter((h) => h.enabled && h.key)
    .forEach((h) => {
      code += `myHeaders.append("${h.key}", "${h.value}");\n`;
    });

  code += `\nlet requestOptions = {\n`;
  code += `  method: '${request.method}',\n`;
  code += `  headers: myHeaders,\n`;

  if (request.body.type !== "none" && bodyText) {
    code += `  body: \`${bodyText.replace(/`/g, "\\`").replace(/\${/g, "\\${")}\`,\n`;
  }
  code += `  redirect: 'follow'\n`;
  code += `};\n\n`;

  code += `fetch("${resolvedUrl}", requestOptions)\n`;
  code += `  .then(response => response.text())\n`;
  code += `  .then(result => console.log(result))\n`;
  code += `  .catch(error => console.log('error', error));\n`;
  return code;
}

export function generateRustReqwest(
  request: ClotientRequest,
  resolvedUrl: string,
  resolvedHeaders: KeyValue[],
  bodyText?: string
): string {
  let code = `use std::collections::HashMap;\n\n`;
  code += `#[tokio::main]\n`;
  code += `async fn main() -> Result<(), Box<dyn std::error::Error>> {\n`;
  code += `    let client = reqwest::Client::new();\n`;
  code += `    let mut headers = reqwest::header::HeaderMap::new();\n`;

  resolvedHeaders
    .filter((h) => h.enabled && h.key)
    .forEach((h) => {
      code += `    headers.insert(\n`;
      code += `        reqwest::header::HeaderName::from_static("${h.key.toLowerCase()}"),\n`;
      code += `        reqwest::header::HeaderValue::from_static("${h.value}"),\n`;
      code += `    );\n`;
    });

  code += `\n`;
  if (request.body.type === "json" && bodyText) {
    // Format JSON body for Rust
    code += `    let body = serde_json::json!(${bodyText});\n\n`;
    code += `    let res = client.${request.method.toLowerCase()}("${resolvedUrl}")\n`;
    code += `        .headers(headers)\n`;
    code += `        .json(&body)\n`;
  } else if (request.body.type !== "none" && bodyText) {
    code += `    let body = r#"${bodyText}"#;\n\n`;
    code += `    let res = client.${request.method.toLowerCase()}("${resolvedUrl}")\n`;
    code += `        .headers(headers)\n`;
    code += `        .body(body)\n`;
  } else {
    code += `    let res = client.${request.method.toLowerCase()}("${resolvedUrl}")\n`;
    code += `        .headers(headers)\n`;
  }

  code += `        .send()\n`;
  code += `        .await?;\n\n`;
  code += `    let body = res.text().await?;\n`;
  code += `    println!("{}", body);\n`;
  code += `    Ok(())\n`;
  code += `}\n`;
  return code;
}
