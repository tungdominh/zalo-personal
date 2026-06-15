import { Zalo, LoginQRCallbackEventType } from "zca-js";
import { saveCredentials, loadCredentials, deleteCredentials, hasCredentials, } from "./credentials.js";
import sharp from "sharp";
import * as fs from "fs";
let apiInstance = null;
let currentUid = null;
// Image metadata getter for zca-js image uploads
async function imageMetadataGetter(filePath) {
    const data = await fs.promises.readFile(filePath);
    const metadata = await sharp(data).metadata();
    return {
        height: metadata.height || 0,
        width: metadata.width || 0,
        size: metadata.size || data.length,
    };
}
export async function loginWithQR(callback) {
    const zalo = new Zalo({ logging: false, selfListen: true, imageMetadataGetter });
    const api = await zalo.loginQR(undefined, (event) => {
        if (event.type === LoginQRCallbackEventType.GotLoginInfo && event.data) {
            saveCredentials({
                imei: event.data.imei,
                cookie: event.data.cookie,
                userAgent: event.data.userAgent,
            });
        }
        callback?.(event);
    });
    apiInstance = api;
    try {
        const raw = await api.fetchAccountInfo();
        const info = raw?.profile ?? raw;
        currentUid = info?.userId ?? null;
    }
    catch {
        // non-critical
    }
    return api;
}
export async function loginWithCredentials() {
    const creds = loadCredentials();
    if (!creds) {
        throw new Error("No saved credentials found. Login with QR first.");
    }
    const zalo = new Zalo({ logging: false, selfListen: true, imageMetadataGetter });
    const api = await zalo.login({
        imei: creds.imei,
        cookie: creds.cookie,
        userAgent: creds.userAgent,
        language: creds.language,
    });
    apiInstance = api;
    try {
        const raw = await api.fetchAccountInfo();
        const info = raw?.profile ?? raw;
        currentUid = info?.userId ?? null;
    }
    catch {
        // non-critical
    }
    return api;
}
export async function getApi() {
    if (apiInstance) {
        return apiInstance;
    }
    if (hasCredentials()) {
        return loginWithCredentials();
    }
    throw new Error("Not authenticated. Login with QR first.");
}
export function getApiSync() {
    return apiInstance;
}
export function getCurrentUid() {
    return currentUid;
}
export function isAuthenticated() {
    return apiInstance !== null;
}
export function hasStoredCredentials() {
    return hasCredentials();
}
export async function logout() {
    apiInstance = null;
    currentUid = null;
    deleteCredentials();
}
export async function ensureAuthenticated() {
    if (apiInstance) {
        return apiInstance;
    }
    return loginWithCredentials();
}
