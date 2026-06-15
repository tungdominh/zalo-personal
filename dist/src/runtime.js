let runtime = null;
export function setZaloPersonalRuntime(next) {
    runtime = next;
}
export function getZaloPersonalRuntime() {
    if (!runtime) {
        throw new Error("ZaloPersonal runtime not initialized");
    }
    return runtime;
}
