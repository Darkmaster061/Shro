export type AdminRole = 'owner' | 'editor' | 'food_manager' | 'scanner';

export interface SiteSettings {
  siteTitle: string;
  universityName: string;
  basijLogoUrl: string;
  heyatLogoUrl: string;
  heroImageUrl: string;
  accentColor: string;
  targetEventTitle: string;
  targetEventDateIso: string;
  targetEventDateJalali: string;
  urgentBannerEnabled: boolean;
  urgentBannerText: string;
  urgentBannerLink: string;
  basijTelegramUrl: string;
  basijEitaaUrl: string;
  basijBaleUrl: string;
  basijRubikaUrl: string;
  heyatTelegramUrl: string;
  heyatEitaaUrl: string;
  heyatBaleUrl: string;
  heyatRubikaUrl: string;
  contactPhones: string;
  responseHours: string;
  basijOfficeLocation: string;
  heyatOfficeLocation: string;
  basijIntroText: string;
  heyatIntroText: string;
  cadresPdfUrl: string;
  cadresPdfTitle: string;
  autoPurgeDays: number;
}

export interface ChecklistStep {
  id: string;
  title: string;
  description: string;
  location: string;
  duration: string;
  isDemo?: boolean;
}

export interface TimelineItem {
  id: string;
  dayTitle: string;
  dateJalali: string;
  timeRange: string;
  location: string;
  description: string;
  isDemo?: boolean;
}

export interface FaqItem {
  id: number;
  category: string;
  question: string;
  answer: string;
  helpfulYes: number;
  helpfulNo: number;
  published: boolean;
  isDemo: boolean;
}

export interface AnnouncementItem {
  id: number;
  title: string;
  summary: string;
  body: string;
  category: 'عمومی' | 'ثبت‌نام' | 'خوابگاه' | 'بسیج' | 'هیئت';
  dateJalali: string;
  eventDateIso?: string;
  eventTime?: string;
  location?: string;
  pinned: boolean;
  published: boolean;
  isDemo: boolean;
}

export interface DormItem {
  id: number;
  name: string;
  gender: 'پسران' | 'دختران' | 'متأهلین';
  address: string;
  distanceToCampus: string;
  neshanUrl: string;
  baladUrl: string;
  monthlyFee: string;
  capacity: string;
  roomType: string;
  curfewHours: string;
  supervisorPhone: string;
  facilities: string[];
  rules: string[];
  requiredDocs: string[];
  gallery: string[];
  faq: { q: string; a: string }[];
  published: boolean;
  isDemo: boolean;
}

export interface CadreItem {
  id: number;
  name: string;
  category: string;
  shortDesc: string;
  fullDesc: string;
  leadName: string;
  meetingSchedule: string;
  joinLink: string;
  contactInfo: string;
  highlights: string[];
  tags: string[];
  imageUrl: string;
  pdfPage?: number;
  published: boolean;
  isDemo: boolean;
}

export interface HeyatProgram {
  id: number;
  title: string;
  dateJalali: string;
  dateIso: string;
  timeRange: string;
  location: string;
  speaker: string;
  maddah: string;
  category: 'هفتگی' | 'مناسبتی' | 'صبحانه' | 'فرهنگی';
  description: string;
  published: boolean;
  isDemo: boolean;
}

export interface MealItem {
  id: number;
  name: string;
  dateJalali: string;
  startTime: string;
  endTime: string;
  active: boolean;
  claimedCount?: number;
  totalActiveStudents?: number;
}

export interface StudentRecord {
  id: number;
  firstName: string;
  lastName: string;
  couponCode: string;
  note: string;
  active: boolean;
  isDemo: boolean;
  createdAt: string;
}

export interface CouponLookupResult {
  studentId: number;
  firstName: string;
  lastName: string;
  couponCode: string;
  note: string;
  activeMeals: MealItem[];
  claimedMealIds: number[];
  hasClaimedAny?: boolean;
  claimedMealName?: string | null;
  claimedDateJalali?: string | null;
  claimedAt?: string | null;
}

export interface ScanClaimResponse {
  status: 'allowed' | 'already_claimed' | 'invalid';
  message: string;
  studentName?: string;
  claimedAt?: string;
  mealName?: string;
  previousMealName?: string;
  claimedDateJalali?: string;
  stats?: {
    claimed: number;
    remaining: number;
    total: number;
  };
}

export interface OfflineScanStudent {
  id: number;
  firstName: string;
  lastName: string;
  firstNameNorm: string;
  lastNameNorm: string;
  couponCode: string;
  active: boolean;
  claimedAtByMeal: Record<number, string>;
}

export interface OfflinePendingClaim {
  localId: string;
  couponCode: string;
  mealId: number;
  scannedAtIso: string;
  studentName: string;
}

export interface StudentQuestion {
  id: number;
  senderName: string;
  category: string;
  question: string;
  answer: string;
  status: 'pending' | 'answered' | 'published_faq';
  createdAt: string;
}

export interface AdminUser {
  id: number;
  username: string;
  displayName: string;
  role: AdminRole;
}

export interface AuditLogEntry {
  id: number;
  username: string;
  action: string;
  detail: string;
  ip: string;
  createdAt: string;
}

export interface CsvPreviewRow {
  rowNumber: number;
  firstName: string;
  lastName: string;
  birthJalali: string;
  note: string;
  valid: boolean;
  error?: string;
  duplicate?: boolean;
}
