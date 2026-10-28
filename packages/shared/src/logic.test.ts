import { describe, expect, it } from 'vitest';
import { canSignRequest, hasPermission, overlaps } from './logic';
import { Account, BookingRequest } from './types';

describe('Logic & Permissions Unit Tests', () => {
  const dummyStaff: Account = {
    id: 'u-staff',
    username: 'staff01',
    password: '',
    name: 'เจ้าหน้าที่ สมชาย',
    nickname: 'ชาย',
    initial: 'ช',
    role: 'STAFF',
    position: 'เจ้าหน้าที่',
    department: 'ฝ่ายบริหาร',
    phone: '081-111-1111',
    permissions: {
      review: true,
      handover: true,
      walkIn: true,
      manageResources: false,
      sign: false,
      manageUsers: false,
    },
    signature: null,
    pin: null,
    createdAt: new Date().toISOString(),
  };

  const dummyL2: Account = {
    id: 'u-palad',
    username: 'palad',
    password: '',
    name: 'ปลัด สมเกียรติ',
    nickname: 'เกียรติ',
    initial: 'ก',
    role: 'APPROVER_L2',
    position: 'ปลัด อบต.',
    department: 'สำนักปลัด',
    phone: '081-222-2222',
    permissions: {
      review: false,
      handover: false,
      walkIn: false,
      manageResources: false,
      sign: true,
      manageUsers: false,
    },
    signature: null,
    pin: null,
    createdAt: new Date().toISOString(),
  };

  describe('overlaps()', () => {
    it('detects overlapping date ranges correctly', () => {
      const a = { start: '2026-10-25T09:00:00Z', end: '2026-10-25T12:00:00Z' };
      const b = { start: '2026-10-25T11:00:00Z', end: '2026-10-25T14:00:00Z' };
      expect(overlaps(a, b)).toBe(true);
    });

    it('returns false for adjacent non-overlapping ranges', () => {
      const a = { start: '2026-10-25T09:00:00Z', end: '2026-10-25T12:00:00Z' };
      const b = { start: '2026-10-25T12:00:00Z', end: '2026-10-25T15:00:00Z' };
      expect(overlaps(a, b)).toBe(false);
    });

    it('returns false for completely disjoint ranges', () => {
      const a = { start: '2026-10-25T09:00:00Z', end: '2026-10-25T12:00:00Z' };
      const b = { start: '2026-10-26T09:00:00Z', end: '2026-10-26T12:00:00Z' };
      expect(overlaps(a, b)).toBe(false);
    });
  });

  describe('hasPermission()', () => {
    it('allows permitted action', () => {
      expect(hasPermission(dummyStaff, 'review')).toBe(true);
      expect(hasPermission(dummyStaff, 'handover')).toBe(true);
    });

    it('denies unpermitted action', () => {
      expect(hasPermission(dummyStaff, 'sign')).toBe(false);
      expect(hasPermission(dummyStaff, 'manageUsers')).toBe(false);
    });
  });

  describe('canSignRequest() with Separation of Duties (SoD)', () => {
    const pendingStaffRequest: Partial<BookingRequest> = {
      id: 'r-001',
      type: 'booking',
      status: 'pending_staff',
      requesterId: 'u-citizen',
      signatures: [],
    };

    it('allows authorized staff to sign pending_staff request', () => {
      const check = canSignRequest(dummyStaff, pendingStaffRequest as BookingRequest);
      expect(check.allowed).toBe(true);
      expect(check.expectedLevel).toBe('staff');
    });

    it('enforces SoD: prevents requester from signing their own request', () => {
      const selfRequest: Partial<BookingRequest> = {
        ...pendingStaffRequest,
        requesterId: dummyStaff.id, // The staff member created this request
      };
      const check = canSignRequest(dummyStaff, selfRequest as BookingRequest);
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('Separation of Duties');
    });

    it('enforces SoD: prevents previous signer from signing again at higher level', () => {
      const pendingL2Request: Partial<BookingRequest> = {
        id: 'r-002',
        type: 'booking',
        status: 'pending_l2',
        requesterId: 'u-citizen',
        signatures: [
          {
            level: 'staff',
            signerId: dummyL2.id, // palad also signed as staff earlier
            signerName: dummyL2.name,
            title: 'เจ้าหน้าที่',
            at: new Date().toISOString(),
            decision: 'approve',
          },
        ],
      };
      const check = canSignRequest(dummyL2, pendingL2Request as BookingRequest);
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('Separation of Duties');
    });
  });
});
