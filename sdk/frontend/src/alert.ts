// AlertContext — extension이 알람을 구독/발행하는 인터페이스
export interface AlertContext {
  fire(event: AlertEvent): void;
  subscribe(ruleId: string, handler: (event: AlertEvent) => void): () => void;
}

export interface AlertEvent {
  ruleId: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  labels?: Record<string, string>;
  firedAt: Date;
}
