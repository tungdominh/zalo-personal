import { executeZaloPersonalTool } from "./tool.js";

// Vietnamese mobile numbers: 03x, 05x, 07x, 08x, 09x (10 digits) or +84/84 prefix
const VN_PHONE_RE = /(?<![0-9])(\+?84|0)(3[2-9]|5[6-9]|7[06-9]|8[0-9]|9[0-9])\d{7}(?![0-9])/g;

export function extractVnPhones(text: string): string[] {
  VN_PHONE_RE.lastIndex = 0;
  const found: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = VN_PHONE_RE.exec(text)) !== null) {
    let phone = m[0];
    if (phone.startsWith("+84")) phone = "0" + phone.slice(3);
    else if (phone.startsWith("84") && !phone.startsWith("0")) phone = "0" + phone.slice(2);
    found.push(phone);
  }
  return [...new Set(found)];
}

export type AutoFriendResult = {
  phone: string;
  status: "sent" | "not_found" | "error";
  userId?: string;
  name?: string;
  message: string;
};

export async function autoSendFriendRequests(
  phones: string[],
  requestMessage?: string,
): Promise<AutoFriendResult[]> {
  const results: AutoFriendResult[] = [];
  for (const phone of phones) {
    try {
      const findResult = await executeZaloPersonalTool("auto", { action: "find-user", phoneNumber: phone });
      const found = (findResult as any).details as any;
      if (!found?.found || !found?.user?.userId) {
        results.push({ phone, status: "not_found", message: `SĐT ${phone}: không tìm thấy trên Zalo` });
        continue;
      }
      const userId = String(found.user.userId);
      const name = found.user.displayName ?? found.user.zaloName ?? userId;
      await executeZaloPersonalTool("auto", {
        action: "send-friend-request",
        userId,
        requestMessage: requestMessage ?? "Xin chào! Kết bạn với mình nhé.",
      });
      results.push({ phone, status: "sent", userId, name, message: `SĐT ${phone}: đã gửi lời mời kết bạn tới ${name}` });
    } catch (err) {
      results.push({ phone, status: "error", message: `SĐT ${phone}: lỗi - ${String(err)}` });
    }
  }
  return results;
}
