import { Injectable } from '@nestjs/common';
import {
  ActivityLog,
  Account,
  AnyRequest,
  AppNotification,
  Equipment,
  HandoverRecord,
  PublicAccount,
  Venue,
  mockAccounts,
  mockActivities,
  mockEquipment,
  mockNotifications,
  mockRequests,
  mockVenues,
} from '@jongwen/shared';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

/**
 * ฐานข้อมูลจำลองในหน่วยความจำ (in-memory) — seed จาก @jongwen/shared mock data
 * รีสตาร์ท API = รีเซ็ตข้อมูลทั้งหมด
 */
@Injectable()
export class DbService {
  accounts: Account[] = clone(mockAccounts);
  venues: Venue[] = clone(mockVenues);
  equipment: Equipment[] = clone(mockEquipment);
  requests: AnyRequest[] = clone(mockRequests);
  notifications: AppNotification[] = clone(mockNotifications);
  activities: ActivityLog[] = clone(mockActivities);
  handovers: HandoverRecord[] = [];

  private seq = { BK: 150, BR: 40, RP: 70, n: 100, l: 100, u: 100, v: 100, e: 100 };

  nextCode(prefix: 'BK' | 'BR' | 'RP') {
    this.seq[prefix] += 1;
    return `${prefix}-2569-${String(this.seq[prefix]).padStart(4, '0')}`;
  }

  nextId(kind: 'n' | 'l' | 'u' | 'v' | 'e') {
    this.seq[kind] += 1;
    return `${kind}-${this.seq[kind]}`;
  }

  reset() {
    this.accounts = clone(mockAccounts);
    this.venues = clone(mockVenues);
    this.equipment = clone(mockEquipment);
    this.requests = clone(mockRequests);
    this.notifications = clone(mockNotifications);
    this.activities = clone(mockActivities);
    this.handovers = [];
  }

  toPublic(a: Account): PublicAccount {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, pin, ...rest } = a;
    return { ...rest, hasPin: !!pin };
  }

  notify(userId: string, title: string, body: string, link?: string) {
    this.notifications.unshift({
      id: this.nextId('n'),
      userId,
      title,
      body,
      link,
      at: new Date().toISOString(),
      read: false,
    });
  }

  notifyRole(role: Account['role'], title: string, body: string, link?: string) {
    this.accounts.filter((a) => a.role === role).forEach((a) => this.notify(a.id, title, body, link));
  }

  log(kind: ActivityLog['kind'], title: string, detail: string) {
    this.activities.unshift({ id: this.nextId('l'), kind, title, detail, at: new Date().toISOString() });
  }
}
