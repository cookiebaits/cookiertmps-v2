export type TabType = 'chat' | 'destinations' | 'titles' | 'security' | 'protection' | 'stats' | 'installer';

export interface DestinationKey {
  id: string;
  name: string;
  envKey: string;
  icon: string;
  stunnelPort?: number;
  rtmpUrl: string;
  category: 'horizontal' | 'vertical';
  value: string;
  enabled: boolean;
}

export interface StreamValidatorLog {
  id: string;
  timestamp: string;
  clientIp: string;
  streamKey: string;
  appName: string;
  status: 'ACCEPTED' | 'REJECTED' | 'WARNING';
  message: string;
}

export interface ChatPlatformConfig {
  id: 'twitch' | 'youtube' | 'kick' | 'tiktok';
  name: string;
  icon: string;
  channel: string;
  active: boolean;
  resolvedYtVideoId?: string;
  isResolvingYt?: boolean;
}
