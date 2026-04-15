export type ZaloPersonalAccountConfig = {
  enabled?: boolean;
  name?: string;
  dmPolicy?: "pairing" | "allowlist" | "open" | "disabled";
  allowFrom?: Array<string | number>;
  denyFrom?: Array<string | number>;
  groupPolicy?: "open" | "allowlist" | "disabled";
  groups?: Record<
    string,
    {
      allow?: boolean;
      enabled?: boolean;
      requireMention?: boolean;
      allowUsers?: Array<string | number>;
      denyUsers?: Array<string | number>;
      tools?: { allow?: string[]; deny?: string[] };
    }
  >;
  messagePrefix?: string;
  responsePrefix?: string;
  /**
   * Formatting guide prepended to every inbound agent turn to teach the LLM
   * Zalo's rich-text capabilities (markdown → TextStyle). Default: enabled
   * with built-in guide text. Set enabled=false to disable entirely, or
   * override `text` to replace the guide with custom instructions.
   */
  formattingGuide?: {
    enabled?: boolean;
    text?: string;
  };
};

export type ZaloPersonalConfig = {
  enabled?: boolean;
  name?: string;
  defaultAccount?: string;
  dmPolicy?: "pairing" | "allowlist" | "open" | "disabled";
  allowFrom?: Array<string | number>;
  denyFrom?: Array<string | number>;
  groupPolicy?: "open" | "allowlist" | "disabled";
  groups?: Record<
    string,
    {
      allow?: boolean;
      enabled?: boolean;
      requireMention?: boolean;
      allowUsers?: Array<string | number>;
      denyUsers?: Array<string | number>;
      tools?: { allow?: string[]; deny?: string[] };
    }
  >;
  messagePrefix?: string;
  responsePrefix?: string;
  accounts?: Record<string, ZaloPersonalAccountConfig>;
};

export type ResolvedZaloPersonalAccount = {
  accountId: string;
  name?: string;
  enabled: boolean;
  authenticated: boolean;
  config: ZaloPersonalAccountConfig;
};

export type ZaloPersonalUserInfo = {
  userId: string;
  displayName: string;
  avatar?: string;
};

export type ZaloPersonalFriend = {
  userId: string;
  displayName: string;
  avatar?: string;
};

export type ZaloPersonalGroup = {
  groupId: string;
  name: string;
  memberCount?: number;
};

export type ZaloPersonalMessage = {
  threadId: string;
  msgId?: string;
  cliMsgId?: string;
  type: number;
  content: string;
  mediaUrls?: string[];    // Media URLs (images, videos, etc.)
  mediaTypes?: string[];   // MIME types corresponding to mediaUrls
  mentions?: Array<{ uid: string; pos: number; len: number; type: 0 | 1 }>;
  // Text content of the quoted/replied-to message, if any — injected into
  // LLM context so the bot sees what the user is replying to even if the
  // original message is outside the group buffer window.
  quoteText?: string;
  quoteSender?: string;
  timestamp: number;
  metadata?: {
    isGroup: boolean;
    groupId?: string;
    senderName?: string;
    fromId?: string;
  };
};
