import type { LucideIcon } from 'lucide-react';
import {
  Home,
  Building2,
  Package,
  Wrench,
  FileText,
  Clock,
  ClipboardList,
  CheckSquare,
  PenTool,
  Shield,
  Users,
} from 'lucide-react';
import { canAccessRoute, PublicAccount, Role } from '@jongwen/shared';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: Role[];
  exact?: boolean;
};

export const NAV: NavItem[] = [
  { href: '/', label: 'หน้าแรก', icon: Home, exact: true },
  { href: '/booking', label: 'สถานที่', icon: Building2 },
  { href: '/borrow', label: 'อุปกรณ์', icon: Package, exact: true },
  { href: '/borrow/my', label: 'คำขอของฉัน', icon: FileText },
  { href: '/repair', label: 'แจ้งซ่อม', icon: Wrench },
  { href: '/history', label: 'ประวัติ', icon: Clock },
  // เจ้าหน้าที่
  { href: '/staff/review', label: 'ตรวจคำขอ', icon: ClipboardList, roles: ['STAFF', 'ADMIN'] },
  { href: '/staff/handover', label: 'รับมอบ-คืน', icon: CheckSquare, roles: ['STAFF', 'ADMIN'] },
  { href: '/staff/walk-in', label: 'กรอกแทน (Walk-in)', icon: PenTool, roles: ['STAFF', 'ADMIN'] },
  // ผู้อนุมัติ
  { href: '/approver', label: 'คิวลงนาม/อนุมัติ', icon: CheckSquare, roles: ['APPROVER_L2', 'APPROVER_L1'] },
  // แอดมิน
  { href: '/admin/resources', label: 'จัดการทรัพยากร', icon: Shield, roles: ['ADMIN'] },
  { href: '/admin/permissions', label: 'กำหนดสิทธิ์ผู้ใช้', icon: Users, roles: ['ADMIN'] },
];

export function getVisibleNav(account: PublicAccount | null): NavItem[] {
  return NAV.filter((item) => {
    if (!item.roles) return true;
    if (!account) return false;
    return canAccessRoute(account, item.href);
  });
}
