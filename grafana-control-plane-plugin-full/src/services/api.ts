import { getBackendSrv } from '@grafana/runtime';

export const api = {
  get: <T>(url: string): Promise<T> => getBackendSrv().get(url),
  post: <T>(url: string, body?: unknown): Promise<T> => getBackendSrv().post(url, body),
};
