export async function probeZaloPersonal(timeoutMs) {
    try {
        const { getApi, getCurrentUid } = await import("./zalo-client.js");
        const api = await getApi();
        const timeoutPromise = timeoutMs
            ? new Promise((_, reject) => setTimeout(() => reject(new Error("Probe timed out")), timeoutMs))
            : null;
        let raw = null;
        try {
            const infoPromise = api.fetchAccountInfo();
            raw = timeoutPromise
                ? await Promise.race([infoPromise, timeoutPromise])
                : await infoPromise;
        }
        catch {
            // fetchAccountInfo may fail even when the connection is alive
        }
        const info = raw?.profile ?? raw;
        if (info?.userId) {
            return {
                ok: true,
                user: {
                    userId: info.userId,
                    displayName: info.displayName,
                    avatar: info.avatar,
                },
            };
        }
        // Fallback: use cached UID from login if fetchAccountInfo didn't return userId
        const cachedUid = getCurrentUid();
        if (cachedUid) {
            return {
                ok: true,
                user: {
                    userId: cachedUid,
                    displayName: info?.displayName,
                    avatar: info?.avatar,
                },
            };
        }
        // API connected (login succeeded) but no user info available yet
        return { ok: true, user: undefined };
    }
    catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
}
