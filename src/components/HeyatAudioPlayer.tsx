import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, Upload, Volume2, VolumeX, Waves } from 'lucide-react';
import { toPersianDigits } from '../utils/persian';

interface AudioTrack {
  id: string;
  title: string;
  performer: string;
  occasion: string;
  durationSec: number;
  bars: number[];
  /** در صورت بارگذاری فایل محلی توسط کاربر یا ادمین */
  srcUrl?: string;
}

const ARCHIVE_TRACKS: AudioTrack[] = [
  {
    id: 'track-1',
    title: 'نوای آغاز مراسم و مناجات دانشجویی [فایل اصلی: نیاز به تکمیل]',
    performer: 'ذاکرین هیئت مجتمع آموزش عالی گناباد',
    occasion: 'مراسم هفتگی سه‌شنبه‌شب‌ها',
    durationSec: 45,
    bars: [
      24, 38, 52, 46, 68, 82, 64, 50, 74, 90, 78, 62, 48, 70, 86, 94, 76, 58, 42, 66,
      84, 72, 54, 60, 88, 96, 80, 62, 48, 74, 66, 50, 44, 70, 82, 68, 54, 40, 58, 72,
      64, 48, 36, 44, 56, 42, 30, 22,
    ],
  },
  {
    id: 'track-2',
    title: 'گزیده روضه و مرثیه استقبال نوورودی‌ها [فایل اصلی: نیاز به تکمیل]',
    performer: 'مداح مهمان [نیاز به تکمیل]',
    occasion: 'ویژه‌برنامه استقبال مهرماه',
    durationSec: 54,
    bars: [
      18, 30, 44, 62, 54, 76, 88, 72, 58, 68, 84, 92, 74, 52, 40, 60, 78, 86, 70, 56,
      46, 64, 80, 94, 82, 66, 50, 42, 58, 76, 88, 72, 60, 48, 68, 84, 76, 58, 44, 52,
      66, 54, 40, 34, 42, 32, 24, 18,
    ],
  },
  {
    id: 'track-3',
    title: 'ذکر توسل و دعای فرج پایانی [فایل اصلی: نیاز به تکمیل]',
    performer: 'جمع‌خوانی دانشجویان هیئت',
    occasion: 'ختم جلسات معنوی',
    durationSec: 36,
    bars: [
      20, 28, 36, 48, 60, 54, 68, 76, 64, 52, 44, 58, 72, 82, 70, 60, 48, 56, 66, 78,
      86, 74, 62, 50, 42, 54, 68, 74, 62, 48, 38, 52, 64, 56, 44, 36, 48, 58, 50, 40,
      34, 42, 36, 28, 24, 20, 18, 16,
    ],
  },
];

function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${toPersianDigits(String(m).padStart(2, '0'))}:${toPersianDigits(String(s).padStart(2, '0'))}`;
}

/**
 * پخش‌کننده صوتی بومی با نمودار موج صوتی تعاملی (SVG Waveform) برای بخش هیئت
 * قانون ۱۱: هیچ صدای خودکاری پخش نمی‌شود؛ پخش تنها با کلیک کاربر آغاز می‌شود.
 * امکان بارگذاری فایل MP3/WAV محلی جهت تست فوری توسط مسئول هیئت نیز فراهم است.
 */
export const HeyatAudioPlayer: React.FC = () => {
  const [tracks, setTracks] = useState<AudioTrack[]>(ARCHIVE_TRACKS);
  const [activeId, setActiveId] = useState<string>(ARCHIVE_TRACKS[0].id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSec, setCurrentSec] = useState(0);
  const [muted, setMuted] = useState(false);

  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const oscNodesRef = useRef<OscillatorNode[]>([]);
  const timerRef = useRef<number | null>(null);

  const activeTrack = tracks.find((t) => t.id === activeId) || tracks[0];
  const progressRatio = activeTrack.durationSec > 0 ? currentSec / activeTrack.durationSec : 0;

  const stopSynth = () => {
    oscNodesRef.current.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // نادیده گرفتن گره‌های متوقف‌شده
      }
    });
    oscNodesRef.current = [];
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopAll = () => {
    stopSynth();
    if (audioElRef.current) {
      audioElRef.current.pause();
    }
    setIsPlaying(false);
  };

  // پاکسازی هنگام خروج از صفحه
  useEffect(() => {
    return () => {
      stopSynth();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // همگام‌سازی بی‌صدا کردن
  useEffect(() => {
    if (audioElRef.current) {
      audioElRef.current.muted = muted;
    }
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(
        muted ? 0 : 0.035,
        audioCtxRef.current.currentTime,
        0.05
      );
    }
  }, [muted]);

  const startGentlePreviewTone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.035;
      master.connect(ctx.destination);
      gainNodeRef.current = master;

      // نوای آرام هارمونیک محلی (ر-لا) فقط برای پیش‌نمایش عملکرد پخش‌کننده
      const freqs = [293.66, 440.0];
      oscNodesRef.current = freqs.map((f, i) => {
        const osc = ctx.createOscillator();
        const subGain = ctx.createGain();
        osc.type = i === 0 ? 'sine' : 'triangle';
        osc.frequency.value = f;
        subGain.gain.value = i === 0 ? 0.7 : 0.25;
        osc.connect(subGain);
        subGain.connect(master);
        osc.start();
        return osc;
      });
    } catch {
      // محیط بدون خروجی صدا همچنان تایمر و موج صوتی را نمایش می‌دهد
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      stopAll();
      return;
    }

    if (activeTrack.srcUrl && audioElRef.current) {
      audioElRef.current.currentTime = currentSec;
      audioElRef.current.muted = muted;
      audioElRef.current.play().catch(() => {});
      setIsPlaying(true);
      return;
    }

    // پیش‌نمایش موج صوتی با نوای ملایم بومی تا پیش از آپلود MP3 اصلی هیئت
    startGentlePreviewTone();
    setIsPlaying(true);
    timerRef.current = window.setInterval(() => {
      setCurrentSec((prev) => {
        if (prev + 0.25 >= activeTrack.durationSec) {
          stopAll();
          return 0;
        }
        return prev + 0.25;
      });
    }, 250);
  };

  const handleSelectTrack = (id: string) => {
    stopAll();
    setActiveId(id);
    setCurrentSec(0);
  };

  const handleSeekBar = (barIndex: number) => {
    const ratio = barIndex / activeTrack.bars.length;
    const nextSec = ratio * activeTrack.durationSec;
    setCurrentSec(nextSec);
    if (activeTrack.srcUrl && audioElRef.current) {
      audioElRef.current.currentTime = nextSec;
    }
  };

  const handleLocalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopAll();
    const objectUrl = URL.createObjectURL(file);
    const customId = `local-${Date.now()}`;
    const newTrack: AudioTrack = {
      id: customId,
      title: file.name.replace(/\.[^/.]+$/, ''),
      performer: 'فایل صوتی بارگذاری‌شده محلی',
      occasion: 'پخش مستقیم از دستگاه شما',
      durationSec: 60,
      bars: ARCHIVE_TRACKS[0].bars,
      srcUrl: objectUrl,
    };
    setTracks((prev) => [newTrack, ...prev]);
    setActiveId(customId);
    setCurrentSec(0);
  };

  return (
    <div
      data-testid="heyat-audio-player"
      className="rounded-3xl border border-line bg-surface p-6 sm:p-7 space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <p className="text-xs font-semibold text-gold inline-flex items-center gap-1.5">
            <Waves className="w-4 h-4" />
            <span>آرشیو صوتی معنوی · پخش بومی بدون اینترنت خارجی</span>
          </p>
          <h2 className="text-lg sm:text-2xl font-bold text-ink mt-1">
            نواها و مداحی‌های منتخب هیئت دانشجویی
          </h2>
        </div>

        <label className="min-h-[40px] px-3.5 rounded-xl border border-line bg-canvas hover:border-gold/50 text-xs font-semibold text-ink inline-flex items-center gap-2 cursor-pointer transition-colors">
          <Upload className="w-4 h-4 text-gold" />
          <span>تست با فایل صوتی خودت (MP3/WAV)</span>
          <input
            type="file"
            accept="audio/*"
            onChange={handleLocalFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* عنصر صوتی واقعی برای فایل‌های بارگذاری‌شده */}
      {activeTrack.srcUrl && (
        <audio
          ref={audioElRef}
          src={activeTrack.srcUrl}
          onLoadedMetadata={(e) => {
            const dur = e.currentTarget.duration;
            if (Number.isFinite(dur) && dur > 0) {
              setTracks((prev) =>
                prev.map((t) => (t.id === activeTrack.id ? { ...t, durationSec: dur } : t))
              );
            }
          }}
          onTimeUpdate={(e) => setCurrentSec(e.currentTarget.currentTime)}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentSec(0);
          }}
        />
      )}

      {/* پنل اصلی موج صوتی */}
      <div className="rounded-2xl border border-gold/30 bg-canvas p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'توقف پخش' : 'شروع پخش'}
              className="w-12 h-12 rounded-2xl bg-gold text-[#071714] hover:bg-gold-strong flex items-center justify-center shrink-0 cursor-pointer transition-colors shadow-md"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 mr-0.5" />}
            </button>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-ink truncate">
                {activeTrack.title}
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                {activeTrack.performer} · {activeTrack.occasion}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-semibold text-gold tabular-nums">
              {formatClock(currentSec)} / {formatClock(activeTrack.durationSec)}
            </span>
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? 'فعال کردن صدا' : 'بی‌صدا کردن'}
              className="min-h-[38px] min-w-[38px] rounded-xl border border-line bg-surface flex items-center justify-center text-ink-muted hover:text-ink cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* نمودار موج صوتی تعاملی (قابل کلیک برای جابه‌جایی زمان) */}
        <div
          className="h-16 flex items-end gap-[3px] sm:gap-1 pt-2"
          role="group"
          aria-label="نمودار موج صوتی قابل جابه‌جایی"
        >
          {activeTrack.bars.map((heightPct, idx) => {
            const barRatio = idx / activeTrack.bars.length;
            const passed = barRatio <= progressRatio;
            const animatedBoost =
              isPlaying && Math.abs(barRatio - progressRatio) < 0.08 ? 14 : 0;
            const finalHeight = Math.min(100, heightPct + animatedBoost);

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSeekBar(idx)}
                aria-label={`رفتن به بخش ${toPersianDigits(idx + 1)} از موج صوتی`}
                className="flex-1 h-full flex items-end cursor-pointer group focus:outline-none"
              >
                <span
                  className={`w-full rounded-full transition-all duration-150 ${
                    passed
                      ? 'bg-gold'
                      : 'bg-line group-hover:bg-gold/55'
                  }`}
                  style={{ height: `${finalHeight}%` }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* لیست قطعات آرشیو */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {tracks.map((track, idx) => {
          const active = track.id === activeTrack.id;
          return (
            <button
              key={track.id}
              type="button"
              onClick={() => handleSelectTrack(track.id)}
              aria-pressed={active}
              className={`text-right rounded-2xl border p-4 transition-colors cursor-pointer ${
                active
                  ? 'border-gold bg-gold-soft/45'
                  : 'border-line bg-canvas/70 hover:border-gold/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-xs text-ink-muted mb-1.5">
                <span className={active ? 'text-gold font-bold' : ''}>
                  نوای {toPersianDigits(idx + 1)}
                </span>
                <span className="tabular-nums">{formatClock(track.durationSec)}</span>
              </div>
              <p className="text-sm font-bold text-ink line-clamp-2">{track.title}</p>
              <p className="text-xs text-ink-muted mt-1">{track.occasion}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
