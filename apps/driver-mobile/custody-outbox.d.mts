export type QueuedCustodyStatus = { package_id: number; status: 'in_progress'; queued_at: string };
export declare const MAX_CUSTODY_OUTBOX_ITEMS: number;
export declare function isNetworkFailure(error: unknown): boolean;
export declare function createCustodyOutbox(options: { storage: { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> }; key?: string; maxItems?: number; now?: () => string }): {
  read(): Promise<QueuedCustodyStatus[]>;
  write(items: QueuedCustodyStatus[]): Promise<void>;
  enqueue(packageId: number, status?: 'in_progress'): Promise<number>;
  flush(request: (item: QueuedCustodyStatus, token: string) => Promise<any>, token: string): Promise<{ remaining: number; synced: any[]; rejected: QueuedCustodyStatus[] }>;
};
