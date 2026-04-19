import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  timeout: 90000,
});

export const WEBHOOK_STORAGE_KEY = "n8n_webhook_url_v1";
export const getStoredWebhook = () => {
  try { return localStorage.getItem(WEBHOOK_STORAGE_KEY) || ""; } catch { return ""; }
};
export const setStoredWebhook = (url) => {
  try { localStorage.setItem(WEBHOOK_STORAGE_KEY, url || ""); } catch { /* noop */ }
};
