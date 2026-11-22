import type {
  AdminUser,
  AnnouncementItem,
  AuditLogEntry,
  BreakfastAnalyticsSummary,
  BreakfastReportFilters,
  CadreItem,
  CohortGroup,
  CouponCheckResponse,
  CouponLookupResult,
  DeskAuthorizedStudent,
  DetailedBreakfastRecord,
  DormItem,
  FaqItem,
  HeyatProgram,
  MealItem,
  OfflinePendingClaim,
  OfflineScanStudent,
  ReportColumnKey,
  ScanClaimResponse,
  SiteSettings,
  StudentQuestion,
  StudentRecord,
} from '../types/portal';

/**
 * لایه واحد ارتباط با API
 * همه درخواست‌های سایت از این فایل عبور می‌کنند تا تعویض یا کش‌کردن بک‌اند ساده باشد.
 */
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const isFormData = options?.body instanceof FormData;
  const headers: Record<string, string> = {
    'X-Requested-With': 'PortalClient',
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options?.headers as Record<string, string> | undefined),
  };

  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'خطا در ارتباط با سرور');
  }
  return data as T;
}

export const api = {
  // عمومی
  getSettings: () => request<SiteSettings>('/api/public/settings'),
  getCaptcha: () => request<{ token: string; question: string }>('/api/public/captcha'),
  getFaqs: (q = '', category = 'همه') =>
    request<FaqItem[]>(
      `/api/public/faq?q=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}`
    ),
  voteFaq: (id: number, helpful: 'yes' | 'no') =>
    request<{ ok: boolean }>(`/api/public/faq/${id}/vote`, {
      method: 'POST',
      body: JSON.stringify({ helpful }),
    }),
  getAnnouncements: () => request<AnnouncementItem[]>('/api/public/announcements'),
  getDorms: () => request<DormItem[]>('/api/public/dorms'),
  getDorm: (id: number) => request<DormItem>(`/api/public/dorms/${id}`),
  getCadres: () => request<CadreItem[]>('/api/public/basij/cadres'),
  getHeyatPrograms: () => request<HeyatProgram[]>('/api/public/heyat/programs'),

  // ژتون صبحانه (مسیر جدید با شماره دانشجویی + مسیر قدیمی) و فرم‌های عمومی
  checkStudentNumber: (studentNumber: string, website = '') =>
    request<CouponCheckResponse>('/api/coupon/check-student-number', {
      method: 'POST',
      body: JSON.stringify({ studentNumber, website }),
    }),
  registerCouponByStudentNumber: (payload: {
    studentNumber: string;
    firstName: string;
    lastName: string;
    birthJalali: string;
    nationalId: string;
    phone: string;
    major: string;
    website?: string;
  }) =>
    request<CouponLookupResult>('/api/coupon/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  recoverCouponByStudentNumber: (payload: {
    studentNumber: string;
    nationalId: string;
    website?: string;
  }) =>
    request<CouponLookupResult>('/api/coupon/recover', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  lookupCoupon: (payload: {
    firstName: string;
    lastName: string;
    birthJalali: string;
    dailyCode?: string;
    website?: string;
  }) =>
    request<CouponLookupResult>('/api/coupon/lookup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // پنل اپراتور میز استقبال لابی (ثبت کد ۴۰۵) و مدیریت کل (ثبت کد ۴۰۵ و سایر ورودی‌ها)
  getDeskAuthorized: (q = '') =>
    request<{
      items: DeskAuthorizedStudent[];
      stats: {
        total: number;
        pendingForm: number;
        registered: number;
        claimed: number;
      };
      canAuthorizeNon405: boolean;
    }>(`/api/desk/authorized?q=${encodeURIComponent(q)}`),
  authorizeStudentNumber: (payload: {
    studentNumber: string;
    cohortGroup?: CohortGroup;
    note?: string;
  }) =>
    request<{
      ok: boolean;
      item: DeskAuthorizedStudent;
      message: string;
    }>('/api/desk/authorize', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteDeskAuthorized: (id: number) =>
    request<{ ok: boolean }>(`/api/desk/authorized/${id}`, {
      method: 'DELETE',
    }),
  createDeskPosterToken: (payload?: { siteUrl?: string; autoPrint?: boolean }) =>
    request<{
      token: string;
      filename: string;
      sizeKb: number;
      downloadUrl: string;
      previewUrl: string;
    }>('/api/desk/poster-token', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
  submitQuestion: (payload: {
    senderName: string;
    category: string;
    question: string;
    captchaToken: string;
    captchaAnswer: string;
    website?: string;
  }) =>
    request<{ ok: boolean; message: string }>('/api/questions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  submitContact: (payload: {
    senderName: string;
    contactInfo: string;
    topic: string;
    message: string;
    captchaToken: string;
    captchaAnswer: string;
    website?: string;
  }) =>
    request<{ ok: boolean; message: string }>('/api/contact', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  submitSurvey: (payload: {
    registrationScore: number;
    breakfastScore: number;
    comment: string;
  }) =>
    request<{ ok: boolean; message: string }>('/api/survey', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // احراز هویت
  login: (username: string, password: string) =>
    request<AdminUser>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  logout: () => request<{ ok: boolean }>('/api/admin/logout', { method: 'POST' }),
  getMe: async () => {
    const res = await request<{ user: AdminUser | null }>('/api/admin/me');
    return res.user;
  },
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: boolean; message: string }>('/api/admin/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  // اسکنر مسئول پخش
  getScanMeals: () => request<MealItem[]>('/api/scan/meals'),
  getScanList: () =>
    request<{ syncedAt: string; students: OfflineScanStudent[] }>('/api/scan/list'),
  claimScan: (couponCode: string, mealId: number, claimedAtIso?: string) =>
    request<ScanClaimResponse>('/api/scan/claim', {
      method: 'POST',
      body: JSON.stringify({ couponCode, mealId, claimedAtIso }),
    }),
  syncOfflineClaims: (items: OfflinePendingClaim[]) =>
    request<{ ok: boolean; synced: number; conflicts: number }>('/api/scan/sync', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  // پنل ادمین
  updateSettings: (partial: Partial<SiteSettings>) =>
    request<SiteSettings>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(partial),
    }),
  uploadFile: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return request<{ url: string; mime: string; size: number }>('/api/admin/upload', {
      method: 'POST',
      body: fd,
    });
  },
  getWalkinConfig: () =>
    request<{ couponWalkinEnabled: boolean; dailyCode: string }>('/api/admin/walkin-config'),
  updateWalkinConfig: (payload: { couponWalkinEnabled: boolean; dailyCode: string }) =>
    request<{ couponWalkinEnabled: boolean; dailyCode: string }>('/api/admin/walkin-config', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  getAdminStudents: (q = '') =>
    request<StudentRecord[]>(`/api/admin/students?q=${encodeURIComponent(q)}`),
  addStudent: (payload: {
    firstName: string;
    lastName: string;
    birthJalali: string;
    note: string;
  }) =>
    request<{ id: number; couponCode: string }>('/api/admin/students', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  importStudentsCsv: (csvText: string) =>
    request<{ inserted: number; skippedExisting: number; invalidRows: number }>(
      '/api/admin/students/import-csv',
      { method: 'POST', body: JSON.stringify({ csvText }) }
    ),
  toggleStudentActive: (id: number, active: boolean) =>
    request<{ ok: boolean }>(`/api/admin/students/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    }),
  deleteStudent: (id: number) =>
    request<{ ok: boolean }>(`/api/admin/students/${id}`, { method: 'DELETE' }),
  getAdminMeals: () => request<MealItem[]>('/api/admin/meals'),
  addMeal: (payload: {
    name: string;
    dateJalali: string;
    startTime: string;
    endTime: string;
    active: boolean;
  }) =>
    request<{ id: number }>('/api/admin/meals', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  toggleMealActive: (id: number, active: boolean) =>
    request<{ ok: boolean }>(`/api/admin/meals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    }),
  getBreakfastReport: () =>
    request<{
      meals: {
        id: number;
        name: string;
        dateJalali: string;
        claimed: number;
        remaining: number;
        total: number;
        unclaimed: { id: number; fullName: string; note: string }[];
      }[];
      suspicious: {
        id: number;
        attempt_type: string;
        detail: string;
        created_at: string;
      }[];
    }>('/api/admin/reports/breakfast'),
  getDetailedBreakfastReport: () =>
    request<{
      records: DetailedBreakfastRecord[];
      analytics: BreakfastAnalyticsSummary;
      meals: MealItem[];
      suspicious: {
        id: number;
        attempt_type: string;
        detail: string;
        created_at: string;
      }[];
    }>('/api/admin/reports/breakfast-detailed'),
  createBreakfastExportToken: (payload: {
    format: 'xlsx' | 'html' | 'pdf';
    columns: ReportColumnKey[];
    filters: Partial<BreakfastReportFilters>;
    title?: string;
  }) =>
    request<{
      token: string;
      filename: string;
      sizeKb: number;
      downloadUrl: string;
      previewUrl: string;
      recordCount: number;
    }>('/api/admin/reports/export-token', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAdminFaqs: () => request<FaqItem[]>('/api/admin/faqs'),
  addFaq: (payload: { category: string; question: string; answer: string }) =>
    request<{ id: number }>('/api/admin/faqs', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteFaq: (id: number) =>
    request<{ ok: boolean }>(`/api/admin/faqs/${id}`, { method: 'DELETE' }),
  getAdminAnnouncements: () => request<AnnouncementItem[]>('/api/admin/announcements'),
  addAnnouncement: (payload: {
    title: string;
    summary: string;
    body: string;
    category: string;
    dateJalali: string;
    eventTime: string;
    location: string;
    pinned: boolean;
  }) =>
    request<{ id: number }>('/api/admin/announcements', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteAnnouncement: (id: number) =>
    request<{ ok: boolean }>(`/api/admin/announcements/${id}`, { method: 'DELETE' }),
  getAdminQuestions: () => request<StudentQuestion[]>('/api/admin/questions'),
  answerQuestion: (id: number, answer: string, publishToFaq: boolean) =>
    request<{ ok: boolean }>(`/api/admin/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ answer, publishToFaq }),
    }),
  getAdminDorms: () => request<DormItem[]>('/api/admin/dorms'),
  addDorm: (payload: Partial<DormItem>) =>
    request<{ id: number }>('/api/admin/dorms', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteDorm: (id: number) =>
    request<{ ok: boolean }>(`/api/admin/dorms/${id}`, { method: 'DELETE' }),
  addCadre: (payload: Partial<CadreItem>) =>
    request<{ id: number }>('/api/admin/cadres', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteCadre: (id: number) =>
    request<{ ok: boolean }>(`/api/admin/cadres/${id}`, { method: 'DELETE' }),
  getAdminOverview: () =>
    request<{
      auditLogs: AuditLogEntry[];
      surveys: {
        id: number;
        registration_score: number;
        breakfast_score: number;
        comment: string;
        created_at: string;
      }[];
      messages: {
        id: number;
        sender_name: string;
        contact_info: string;
        topic: string;
        message: string;
        created_at: string;
      }[];
      demoCounts: Record<string, number>;
    }>('/api/admin/overview'),
  clearDemoData: () =>
    request<{ ok: boolean }>('/api/admin/clear-demo', { method: 'POST' }),
  createOfflineHtmlExportToken: () =>
    request<{
      token: string;
      filename: string;
      sizeKb: number;
      downloadUrl: string;
      previewUrl: string;
    }>('/api/admin/export-offline-token', { method: 'POST' }),
  downloadOfflineHtml: async (
    directUrl?: string
  ): Promise<{ blob: Blob; html: string; filename: string }> => {
    const res = await fetch(directUrl || '/api/admin/export-offline-html', {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) {
      let msg = 'خطا در دریافت خروجی آفلاین HTML.';
      try {
        const data = (await res.json()) as { error?: string };
        if (data.error) msg = data.error;
      } catch {
        // ignore parse error
      }
      throw new Error(msg);
    }
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^";]+)"?/i);
    const filename = match?.[1] || 'gonabad-portal-offline-preview.html';
    const html = await res.text();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    return { blob, html, filename };
  },
};
