export interface KeyValue {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

export type BodyType = 'none' | 'json' | 'form-data' | 'urlencoded' | 'raw';

export interface RequestBody {
  type: BodyType;
  rawText?: string;
  formData?: KeyValue[];
  urlencoded?: KeyValue[];
}

export interface ScriptConfig {
  preRequest: string;
  postRequest: string;
}

export interface ClotientRequest {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';
  url: string;
  headers: KeyValue[];
  params: KeyValue[];
  body: RequestBody;
  scripts: ScriptConfig;
  auth: {
    type: 'none' | 'bearer' | 'basic';
    bearerToken?: string;
    basicUsername?: string;
    basicPassword?: string;
  };
}

export interface ClotientCollectionFolder {
  id: string;
  name: string;
  requests: ClotientRequest[];
}

export interface ClotientCollection {
  id: string;
  name: string;
  description?: string;
  requests: ClotientRequest[];
  folders: ClotientCollectionFolder[];
}

export interface Environment {
  id: string;
  name: string;
  variables: KeyValue[];
}

export interface HttpResponsePayload {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  timeMs: number;
  sizeBytes: number;
  contentType: string;
}

export interface HistoryItem {
  id: string;
  url: string;
  method: string;
  timestamp: number;
  request: ClotientRequest;
  response?: HttpResponsePayload;
}
