import React, { useEffect, useState } from 'react';
import { Clock, Mail, MapPin, MessageSquare, Phone, RefreshCw, Send } from 'lucide-react';
import { api } from '../api/client';
import { usePortal } from '../context/PortalContext';
import { BASIJ_OFFICIAL_INFO, OFFICIAL_UNIVERSITY_CONTACT } from '../data/orientation';

export const ContactPage: React.FC = () => {
  const { settings, showToast } = usePortal();
  const [senderName, setSenderName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [topic, setTopic] = useState('راهنمای ثبت‌نام');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [captcha, setCaptcha] = useState<{ token: string; question: string } | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [sending, setSending] = useState(false);

  const loadCaptcha = () => {
    api.getCaptcha().then(setCaptcha).catch(() => {});
  };

  useEffect(() => {
    loadCaptcha();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captcha) return;
    setSending(true);
    try {
      const res = await api.submitContact({
        senderName,
        contactInfo,
        topic,
        message,
        captchaToken: captcha.token,
        captchaAnswer,
        website: honeypot,
      });
      showToast(res.message, 'success');
      setSenderName('');
      setContactInfo('');
      setMessage('');
      setCaptchaAnswer('');
      loadCaptcha();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'خطا در ارسال پیام', 'error');
      loadCaptcha();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      <div className="border-b border-line pb-6">
        <p className="text-xs font-semibold text-gold mb-1">ارتباط مستقیم با تیم اجرایی</p>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-ink">تماس با بسیج دانشجویی و هیئت</h1>
        <p className="mt-2 text-sm text-ink-muted max-w-2xl">
          برای هرگونه سوال فوری درباره ثبت‌نام، خوابگاه، کانون‌ها یا ژتون صبحانه در خدمت شما و خانواده‌های محترم هستیم.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-line bg-surface p-6 space-y-4">
            <h2 className="text-lg font-bold text-ink">اطلاعات تماس و نشانی دفاتر</h2>

            <div className="space-y-3 text-sm text-ink-muted">
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-gold mt-1 shrink-0" />
                <div>
                  <p className="font-semibold text-ink">شماره‌های تماس</p>
                  <p className="mt-0.5">{settings.contactPhones}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-gold mt-1 shrink-0" />
                <div>
                  <p className="font-semibold text-ink">ساعت پاسخگویی</p>
                  <p className="mt-0.5">{settings.responseHours}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gold mt-1 shrink-0" />
                <div>
                  <p className="font-semibold text-ink">دفتر بسیج دانشجویی</p>
                  <p className="mt-0.5">{settings.basijOfficeLocation}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gold mt-1 shrink-0" />
                <div>
                  <p className="font-semibold text-ink">دفتر هیئت دانشجویی</p>
                  <p className="mt-0.5">{settings.heyatOfficeLocation}</p>
                </div>
              </div>

              <div className="rounded-xl border border-line bg-canvas p-3.5 space-y-2 text-xs">
                <p className="font-bold text-ink">{BASIJ_OFFICIAL_INFO.officialName}</p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={BASIJ_OFFICIAL_INFO.telegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-surface border border-line hover:border-gold/50 text-gold font-mono"
                    dir="ltr"
                  >
                    {BASIJ_OFFICIAL_INFO.telegramHandle}
                  </a>
                  <a
                    href={BASIJ_OFFICIAL_INFO.eitaaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-surface border border-line hover:border-gold/50 text-ink"
                  >
                    ایتا: <span dir="ltr" className="font-mono text-gold">basijuog</span>
                  </a>
                  <a
                    href={BASIJ_OFFICIAL_INFO.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-surface border border-line hover:border-gold/50 text-ink"
                  >
                    پروفایل: <span dir="ltr" className="font-mono text-gold">{BASIJ_OFFICIAL_INFO.profileLabel}</span>
                  </a>
                </div>
                <p className="text-ink-muted">
                  ادمین برادران:{' '}
                  <a href={BASIJ_OFFICIAL_INFO.brothersAdminUrl} target="_blank" rel="noopener noreferrer" dir="ltr" className="font-mono text-gold hover:underline">
                    {BASIJ_OFFICIAL_INFO.brothersAdminHandle}
                  </a>
                  {' · '}
                  ادمین خواهران:{' '}
                  <a href={BASIJ_OFFICIAL_INFO.sistersAdminUrl} target="_blank" rel="noopener noreferrer" dir="ltr" className="font-mono text-gold hover:underline">
                    {BASIJ_OFFICIAL_INFO.sistersAdminHandle}
                  </a>
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-line flex flex-wrap gap-2.5">
              <a
                href="https://neshan.org/maps"
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[40px] px-4 rounded-xl bg-emerald-deep text-[#f4f1e8] hover:bg-emerald-mid text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <MapPin className="w-4 h-4" />
                <span>مسیریابی دانشگاه با نشان</span>
              </a>
              <a
                href="https://balad.ir"
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[40px] px-4 rounded-xl border border-line bg-canvas text-xs font-semibold text-ink inline-flex items-center gap-1.5"
              >
                <span>مسیریابی با بلد</span>
              </a>
            </div>
          </div>

          {/* اطلاعات رسمی تماس مجتمع آموزش عالی گناباد */}
          <div className="rounded-2xl border border-gold/35 bg-surface p-6 space-y-4">
            <h2 className="text-base font-bold text-gold">اطلاعات رسمی مجتمع آموزش عالی گناباد</h2>
            <div className="space-y-2.5 text-xs sm:text-sm text-ink-muted">
              <p>
                <strong className="text-ink">آدرس دقیق: </strong>
                {OFFICIAL_UNIVERSITY_CONTACT.address}
              </p>
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div className="rounded-xl border border-line bg-canvas p-3">
                  <span className="text-[11px] block">تلفن دانشگاه</span>
                  <strong dir="ltr" className="text-ink tabular-nums">{OFFICIAL_UNIVERSITY_CONTACT.phone}</strong>
                </div>
                <div className="rounded-xl border border-line bg-canvas p-3">
                  <span className="text-[11px] block">کدپستی</span>
                  <strong dir="ltr" className="text-ink tabular-nums">{OFFICIAL_UNIVERSITY_CONTACT.postalCode}</strong>
                </div>
                <div className="rounded-xl border border-line bg-canvas p-3">
                  <span className="text-[11px] block inline-flex items-center gap-1"><Mail className="w-3 h-3 text-gold" /> پست الکترونیک</span>
                  <strong dir="ltr" className="text-ink text-xs">{OFFICIAL_UNIVERSITY_CONTACT.email}</strong>
                </div>
                <div className="rounded-xl border border-line bg-canvas p-3">
                  <span className="text-[11px] block inline-flex items-center gap-1"><MessageSquare className="w-3 h-3 text-gold" /> سامانه پیامکی</span>
                  <strong dir="ltr" className="text-ink tabular-nums">{OFFICIAL_UNIVERSITY_CONTACT.smsSystem}</strong>
                </div>
              </div>
              <div className="rounded-xl border border-gold/30 bg-gold-soft/40 p-3 space-y-1">
                <p className="text-xs font-bold text-gold">شماره‌های تماس ضروری پذیرفته‌شدگان ۱۴۰۵:</p>
                <p dir="ltr" className="text-right font-bold text-ink tabular-nums">
                  {OFFICIAL_UNIVERSITY_CONTACT.emergencyPhones.join('  ·  ')}
                </p>
              </div>
              <div className="space-y-1 pt-1 text-xs">
                <p>
                  <strong className="text-ink">{OFFICIAL_UNIVERSITY_CONTACT.dormSisters.title} ({OFFICIAL_UNIVERSITY_CONTACT.dormSisters.person}):</strong>{' '}
                  <span dir="ltr" className="tabular-nums text-gold font-bold">{OFFICIAL_UNIVERSITY_CONTACT.dormSisters.phone}</span>
                </p>
                <p>
                  <strong className="text-ink">{OFFICIAL_UNIVERSITY_CONTACT.dormBrothers.title} ({OFFICIAL_UNIVERSITY_CONTACT.dormBrothers.person}):</strong>{' '}
                  <span dir="ltr" className="tabular-nums text-gold font-bold">{OFFICIAL_UNIVERSITY_CONTACT.dormBrothers.phone}</span>
                </p>
                <p>
                  <strong className="text-ink">{OFFICIAL_UNIVERSITY_CONTACT.nutritionOffice.title} ({OFFICIAL_UNIVERSITY_CONTACT.nutritionOffice.person}):</strong>{' '}
                  <span dir="ltr" className="tabular-nums text-gold font-bold">{OFFICIAL_UNIVERSITY_CONTACT.nutritionOffice.phone}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <h2 className="text-lg font-bold text-ink">ارسال پیام به مسئولان</h2>
          <p className="text-xs text-ink-muted mt-1">
            پیام شما مستقیم در پنل ادمین ثبت می‌شود و پاسخ از طریق راه ارتباطی دلخواه شما ارسال خواهد شد.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <input
              type="text"
              name="website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="c-name" className="block text-xs font-medium text-ink-muted mb-1.5">
                  نام و نام‌خانوادگی
                </label>
                <input
                  id="c-name"
                  type="text"
                  required
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="c-info" className="block text-xs font-medium text-ink-muted mb-1.5">
                  آیدی پیام‌رسان یا شماره تماس جهت پاسخ
                </label>
                <input
                  id="c-info"
                  type="text"
                  required
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder="مثلاً آیدی ایتا/بله یا شماره موبایل"
                  className="w-full min-h-[44px] rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink"
                />
              </div>
            </div>

            <div>
              <label htmlFor="c-topic" className="block text-xs font-medium text-ink-muted mb-1.5">
                موضوع پیام
              </label>
              <select
                id="c-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink"
              >
                <option value="راهنمای ثبت‌نام">راهنمای ثبت‌نام</option>
                <option value="خوابگاه">خوابگاه</option>
                <option value="ژتون صبحانه">ژتون صبحانه</option>
                <option value="بسیج و کانون‌ها">بسیج و کانون‌ها</option>
                <option value="هیئت دانشجویی">هیئت دانشجویی</option>
                <option value="سایر">سایر</option>
              </select>
            </div>

            <div>
              <label htmlFor="c-msg" className="block text-xs font-medium text-ink-muted mb-1.5">
                متن پیام
              </label>
              <textarea
                id="c-msg"
                rows={4}
                required
                minLength={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-xl border border-line bg-canvas p-3.5 text-sm text-ink"
              />
            </div>

            {captcha && (
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label htmlFor="c-cap" className="block text-xs font-medium text-ink-muted mb-1.5">
                    سوال امنیتی: <strong className="text-ink">{captcha.question}</strong>
                  </label>
                  <input
                    id="c-cap"
                    type="text"
                    inputMode="numeric"
                    required
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink tabular-nums"
                  />
                </div>
                <button
                  type="button"
                  onClick={loadCaptcha}
                  aria-label="سوال امنیتی جدید"
                  className="min-h-[44px] min-w-[44px] rounded-xl border border-line bg-canvas flex items-center justify-center text-ink-muted hover:text-ink cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={sending}
              className="min-h-[46px] px-6 rounded-xl bg-gold text-[#071714] hover:bg-gold-strong font-bold text-sm inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              <span>{sending ? 'در حال ارسال...' : 'ارسال پیام'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
