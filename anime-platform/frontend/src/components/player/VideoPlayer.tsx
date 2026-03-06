'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, Volume2, VolumeX, Volume1,
  Maximize, Minimize, Loader2, SkipForward, SkipBack,
  Settings, PictureInPicture2, Subtitles,
} from 'lucide-react';

interface Subtitle {
  url: string;
  lang: string;
}

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  headers?: Record<string, string>;
  subtitles?: Subtitle[];
  onProgress?: (currentTime: number, duration: number) => void;
}

const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

// Detect iOS
const isIOS = () =>
  typeof navigator !== 'undefined' &&
  /iPad|iPhone|iPod/.test(navigator.userAgent);

// Detect Android
const isAndroid = () =>
  typeof navigator !== 'undefined' &&
  /Android/.test(navigator.userAgent);

const isMobile = () => isIOS() || isAndroid();

export function VideoPlayer({ src, poster, title, headers, subtitles, onProgress }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekBarRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number>(0);
  const touchStartTimeRef = useRef<number>(0);
  const lastTapRef = useRef<number>(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);
  const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null);
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [subtitleCues, setSubtitleCues] = useState<{ start: number; end: number; text: string }[]>([]);
  const [currentCueText, setCurrentCueText] = useState<string>('');
  const [seekFeedback, setSeekFeedback] = useState<{ dir: 'forward' | 'back'; show: boolean }>({ dir: 'forward', show: false });
  const subtitleCacheRef = useRef<Map<string, { start: number; end: number; text: string }[]>>(new Map());

  // Lock orientation to landscape on fullscreen for mobile
  const lockOrientation = useCallback(async (lock: boolean) => {
    try {
      if (lock) {
        await (screen.orientation as any)?.lock?.('landscape');
      } else {
        (screen.orientation as any)?.unlock?.();
      }
    } catch {
      // Not supported — ignore silently
    }
  }, []);

  // iOS-specific fullscreen using webkitEnterFullscreen
  const enterIOSFullscreen = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if ((video as any).webkitEnterFullscreen) {
      (video as any).webkitEnterFullscreen();
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    if (isIOS()) {
      // iOS: use webkit API on <video> element
      if ((video as any).webkitDisplayingFullscreen) {
        (video as any).webkitExitFullscreen?.();
      } else {
        enterIOSFullscreen();
      }
      return;
    }

    if (!document.fullscreenElement) {
      try {
        await container.requestFullscreen();
        if (isMobile()) await lockOrientation(true);
      } catch {
        // fallback: try video element
        try {
          await (video as any).requestFullscreen?.();
        } catch { }
      }
    } else {
      await document.exitFullscreen();
      if (isMobile()) await lockOrientation(false);
    }
  }, [enterIOSFullscreen, lockOrientation]);

  // Initialize video source
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setError(null);
    setProgress(0);
    setDuration(0);
    setIsPlaying(false);

    const isHls = src.includes('.m3u8') && !src.includes('.mp4');
    let mediaRecoveryAttempts = 0;

    if (isHls) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          enableWorker: false,
          ...(headers ? {
            xhrSetup: (xhr: XMLHttpRequest) => {
              Object.entries(headers).forEach(([key, value]) => {
                xhr.setRequestHeader(key, value);
              });
            }
          } : {}),
        });
        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => setIsLoading(false));
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              if (mediaRecoveryAttempts < 2) {
                mediaRecoveryAttempts++;
                hls.recoverMediaError();
              } else {
                mediaRecoveryAttempts = 0;
                hls.swapAudioCodec();
                hls.recoverMediaError();
              }
            } else if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              setError('Network error — could not load stream');
              setIsLoading(false);
            } else {
              setError('Failed to load video stream');
              setIsLoading(false);
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari / iOS native HLS support
        video.src = src;
        video.addEventListener('loadedmetadata', () => setIsLoading(false));
      } else {
        setError('HLS is not supported in your browser');
        setIsLoading(false);
      }
    } else {
      video.src = src;
      video.addEventListener('loadedmetadata', () => setIsLoading(false));
      video.addEventListener('error', () => {
        setError('Failed to load video');
        setIsLoading(false);
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src]);

  // Parse VTT
  const parseVTT = useCallback((vttText: string) => {
    const cues: { start: number; end: number; text: string }[] = [];
    const blocks = vttText.replace(/\r/g, '').split('\n\n');
    for (const block of blocks) {
      const lines = block.trim().split('\n');
      const timeLine = lines.find(l => l.includes('-->'));
      if (!timeLine) continue;
      const [startStr, endStr] = timeLine.split('-->');
      const parseTime = (t: string) => {
        const parts = t.trim().split(':');
        if (parts.length === 3) {
          const [h, m, s] = parts;
          return parseInt(h) * 3600 + parseInt(m) * 60 + parseFloat(s.replace(',', '.'));
        } else if (parts.length === 2) {
          const [m, s] = parts;
          return parseInt(m) * 60 + parseFloat(s.replace(',', '.'));
        }
        return 0;
      };
      const start = parseTime(startStr);
      const end = parseTime(endStr);
      const textIdx = lines.indexOf(timeLine);
      const text = lines.slice(textIdx + 1).join('\n').replace(/<[^>]+>/g, '').trim();
      if (text) cues.push({ start, end, text });
    }
    return cues;
  }, []);

  const loadSubtitleTrack = useCallback(async (lang: string | null) => {
    if (!lang || !subtitles?.length) {
      setSubtitleCues([]);
      setCurrentCueText('');
      setActiveSubtitle(null);
      return;
    }
    const sub = subtitles.find(s => s.lang === lang);
    if (!sub) return;

    if (subtitleCacheRef.current.has(sub.url)) {
      setSubtitleCues(subtitleCacheRef.current.get(sub.url)!);
      setActiveSubtitle(lang);
      return;
    }

    try {
      const res = await fetch(sub.url);
      const text = await res.text();
      const cues = parseVTT(text);
      subtitleCacheRef.current.set(sub.url, cues);
      setSubtitleCues(cues);
      setActiveSubtitle(lang);
    } catch {
      setSubtitleCues([]);
    }
  }, [subtitles, parseVTT]);

  useEffect(() => {
    if (!subtitles?.length) {
      setSubtitleCues([]);
      setActiveSubtitle(null);
      return;
    }
    subtitleCacheRef.current.clear();
    const engSub = subtitles.find(
      (s) => s.lang.toLowerCase().includes('english') || s.lang.toLowerCase() === 'en'
    );
    if (engSub) loadSubtitleTrack(engSub.lang);
  }, [subtitles, src]);

  useEffect(() => {
    if (!subtitleCues.length) { setCurrentCueText(''); return; }
    const video = videoRef.current;
    if (!video) return;
    const updateCue = () => {
      const t = video.currentTime;
      const cue = subtitleCues.find(c => t >= c.start && t <= c.end);
      setCurrentCueText(cue?.text || '');
    };
    video.addEventListener('timeupdate', updateCue);
    return () => video.removeEventListener('timeupdate', updateCue);
  }, [subtitleCues]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (!isSeeking) setProgress(video.currentTime);
      setDuration(video.duration);
      onProgress?.(video.currentTime, video.duration);
    };
    const handleProgress = () => {
      if (video.buffered.length > 0)
        setBuffered(video.buffered.end(video.buffered.length - 1));
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [onProgress, isSeeking]);

  // Fullscreen change listeners — handle both standard and webkit (iOS)
  useEffect(() => {
    const handleFSChange = () => {
      const isFull = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement
      );
      setIsFullscreen(isFull);
      if (!isFull && isMobile()) lockOrientation(false);
    };

    // iOS webkit fullscreen events on the video element
    const video = videoRef.current;
    const handleWebkitBegin = () => setIsFullscreen(true);
    const handleWebkitEnd = () => setIsFullscreen(false);

    document.addEventListener('fullscreenchange', handleFSChange);
    document.addEventListener('webkitfullscreenchange', handleFSChange);
    video?.addEventListener('webkitbeginfullscreen', handleWebkitBegin);
    video?.addEventListener('webkitendfullscreen', handleWebkitEnd);

    return () => {
      document.removeEventListener('fullscreenchange', handleFSChange);
      document.removeEventListener('webkitfullscreenchange', handleFSChange);
      video?.removeEventListener('webkitbeginfullscreen', handleWebkitBegin);
      video?.removeEventListener('webkitendfullscreen', handleWebkitEnd);
    };
  }, [lockOrientation]);

  // Keyboard shortcuts (desktop)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'arrowleft':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          flashControls();
          break;
        case 'arrowright':
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
          flashControls();
          break;
        case 'arrowup':
          e.preventDefault();
          setVolumeLevel(Math.min(1, video.volume + 0.1));
          flashControls();
          break;
        case 'arrowdown':
          e.preventDefault();
          setVolumeLevel(Math.max(0, video.volume - 0.1));
          flashControls();
          break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleFullscreen]);

  // Auto-hide controls
  const flashControls = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
        setShowSpeedMenu(false);
        setShowSubMenu(false);
      }
    }, 3000);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) { video.play(); } else { video.pause(); }
    flashControls();
  }, [flashControls]);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const setVolumeLevel = (val: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = val;
    setVolume(val);
    if (val === 0) { video.muted = true; setIsMuted(true); }
    else if (video.muted) { video.muted = false; setIsMuted(false); }
  };

  const changeSpeed = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  };

  const skip = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    setSeekFeedback({ dir: seconds > 0 ? 'forward' : 'back', show: true });
    setTimeout(() => setSeekFeedback(f => ({ ...f, show: false })), 700);
    flashControls();
  }, [flashControls]);

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch { }
  };

  const selectSubtitle = (lang: string | null) => {
    loadSubtitleTrack(lang);
    setShowSubMenu(false);
  };

  // Touch handling for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartTimeRef.current = videoRef.current?.currentTime ?? 0;

    // Double tap detection
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const tapX = e.touches[0].clientX - rect.left;
      if (tapX < rect.width / 2) {
        skip(-10);
      } else {
        skip(10);
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      // Single tap toggles controls
      if (showControls) {
        // If controls visible, hide on tap (but not on control elements)
        if (!(e.target as HTMLElement).closest('[data-controls]')) {
          if (isPlaying) {
            setShowControls(false);
          }
        }
      } else {
        flashControls();
      }
    }
  }, [showControls, isPlaying, skip, flashControls]);

  // Touch seek on seek bar
  const handleSeekTouch = (e: React.TouchEvent) => {
    const bar = seekBarRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();

    const getTime = (touch: { clientX: number }) =>
      Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width)) * (duration || 0);

    if (e.type === 'touchstart') {
      setIsSeeking(true);
      setProgress(getTime(e.touches[0]));
    } else if (e.type === 'touchmove') {
      e.preventDefault();
      setProgress(getTime(e.touches[0]));
    } else if (e.type === 'touchend') {
      if (videoRef.current) videoRef.current.currentTime = getTime(e.changedTouches[0]);
      setIsSeeking(false);
    }
  };

  // Mouse seek on seek bar
  const handleSeekBarMouse = (e: React.MouseEvent, action: 'down' | 'move') => {
    const bar = seekBarRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const time = x * (duration || 0);

    if (action === 'down') {
      setIsSeeking(true);
      setProgress(time);

      const handleMouseMove = (ev: MouseEvent) => {
        const mx = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
        setProgress(mx * (duration || 0));
      };
      const handleMouseUp = (ev: MouseEvent) => {
        const ux = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
        if (videoRef.current) videoRef.current.currentTime = ux * (duration || 0);
        setIsSeeking(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      setHoverTime(time);
      setHoverX(e.clientX - rect.left);
    }
  };

  const formatTime = (time: number) => {
    if (!isFinite(time)) return '0:00';
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration ? (progress / duration) * 100 : 0;
  const bufferedPercent = duration ? (buffered / duration) * 100 : 0;

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      ref={containerRef}
      className="player-container group"
      style={{
        // Critical for iOS fullscreen + safe area support
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
      onMouseMove={!isMobile() ? flashControls : undefined}
      onMouseLeave={!isMobile() ? () => {
        if (isPlaying && !isSeeking) {
          if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
          controlsTimerRef.current = setTimeout(() => {
            setShowControls(false);
            setShowSpeedMenu(false);
          }, 1000);
        }
      } : undefined}
      onTouchStart={isMobile() ? handleTouchStart : undefined}
      onDoubleClick={!isMobile() ? (e) => {
        if ((e.target as HTMLElement).closest('[data-controls]')) return;
        toggleFullscreen();
      } : undefined}
    >
      <video
        ref={videoRef}
        poster={poster}
        onClick={!isMobile() ? togglePlay : undefined}
        className="absolute inset-0 w-full h-full object-contain"
        style={{ cursor: isMobile() ? 'default' : 'pointer' }}
        playsInline
        // iOS inline playback (prevents auto-fullscreen on play)
        webkit-playsinline="true"
      />

      {/* Subtitle Overlay */}
      {currentCueText && (
        <div
          className="absolute left-0 right-0 z-10 flex justify-center pointer-events-none px-4"
          style={{
            bottom: showControls ? '80px' : '16px',
            transition: 'bottom 0.3s ease',
          }}
        >
          <div className="bg-black/75 text-white text-sm sm:text-base md:text-lg px-4 py-2 rounded-lg max-w-[90%] text-center leading-relaxed">
            {currentCueText.split('\n').map((line, i, arr) => (
              <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none z-10">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-[3px] border-white/10" />
            <Loader2 className="absolute inset-0 w-16 h-16 text-primary-400 animate-spin" />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
          <div className="text-center max-w-md px-6">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <Play className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-red-400 text-lg font-semibold">{error}</p>
            <p className="text-dark-400 text-sm mt-2">Try refreshing or selecting a different episode.</p>
          </div>
        </div>
      )}

      {/* Center play button */}
      <AnimatePresence>
        {!isPlaying && !isLoading && !error && (
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center z-10"
          >
            <div className="w-20 h-20 bg-primary-500/90 rounded-full flex items-center justify-center backdrop-blur-md shadow-2xl shadow-primary-500/30 hover:bg-primary-400 active:scale-95 transition-all hover:scale-110">
              <Play className="w-9 h-9 text-white ml-1" fill="white" />
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Seek feedback (mobile double-tap) */}
      <AnimatePresence>
        {seekFeedback.show && (
          <motion.div
            key={seekFeedback.dir}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute top-1/2 -translate-y-1/2 pointer-events-none z-20 flex flex-col items-center gap-1 ${seekFeedback.dir === 'forward' ? 'right-8' : 'left-8'
              }`}
          >
            <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-white font-semibold text-sm">
              {seekFeedback.dir === 'forward' ? '+10s' : '-10s'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls overlay */}
      <div
        data-controls
        className={`absolute bottom-0 left-0 right-0 z-20 transition-all duration-300 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        // Prevent touch from propagating to video (which might hide controls)
        onTouchStart={e => e.stopPropagation()}
      >
        {/* Gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none" />

        <div
          className="relative px-4 pb-4 pt-12"
          style={{
            // Respect safe-area-inset for notched phones
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
            paddingLeft: 'max(16px, env(safe-area-inset-left))',
            paddingRight: 'max(16px, env(safe-area-inset-right))',
          }}
        >
          {/* Title */}
          {title && (
            <p className="text-white/90 text-sm font-medium mb-3 drop-shadow-lg truncate">{title}</p>
          )}

          {/* Seek Bar — larger touch target on mobile */}
          <div
            ref={seekBarRef}
            className="group/seek relative flex items-center cursor-pointer mb-3"
            style={{ height: isMobile() ? '28px' : '24px' }}
            onMouseDown={!isMobile() ? (e) => handleSeekBarMouse(e, 'down') : undefined}
            onMouseMove={!isMobile() ? (e) => handleSeekBarMouse(e, 'move') : undefined}
            onMouseLeave={!isMobile() ? () => setHoverTime(null) : undefined}
            onTouchStart={isMobile() ? handleSeekTouch : undefined}
            onTouchMove={isMobile() ? handleSeekTouch : undefined}
            onTouchEnd={isMobile() ? handleSeekTouch : undefined}
          >
            {/* Hover tooltip (desktop only) */}
            {hoverTime !== null && !isSeeking && !isMobile() && (
              <div
                className="absolute -top-8 px-2 py-1 bg-dark-900/95 rounded text-xs text-white font-medium pointer-events-none border border-dark-700/50 shadow-lg"
                style={{ left: `${hoverX}px`, transform: 'translateX(-50%)' }}
              >
                {formatTime(hoverTime)}
              </div>
            )}

            {/* Track */}
            <div
              className="absolute left-0 right-0 rounded-full overflow-hidden bg-white/20"
              style={{ height: isMobile() ? '4px' : '4px', transition: 'height 0.15s' }}
            >
              <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full" style={{ width: `${bufferedPercent}%` }} />
              <div className="absolute inset-y-0 left-0 bg-primary-500 rounded-full" style={{ width: `${progressPercent}%` }} />
            </div>

            {/* Thumb — bigger on mobile */}
            <div
              className="absolute top-1/2 -translate-y-1/2 bg-primary-400 rounded-full shadow-lg shadow-primary-500/50 pointer-events-none"
              style={{
                width: isMobile() ? '16px' : '14px',
                height: isMobile() ? '16px' : '14px',
                left: `calc(${progressPercent}% - ${isMobile() ? '8px' : '7px'})`,
                opacity: isSeeking || isMobile() ? 1 : undefined,
              }}
            />
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between gap-2">
            {/* Left Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={togglePlay}
                className="player-btn"
                style={{ touchAction: 'manipulation' }}
              >
                {isPlaying
                  ? <Pause className="w-5 h-5" fill="white" />
                  : <Play className="w-5 h-5 ml-0.5" fill="white" />}
              </button>

              <button
                onClick={() => skip(-10)}
                className="player-btn"
                style={{ touchAction: 'manipulation' }}
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={() => skip(10)}
                className="player-btn"
                style={{ touchAction: 'manipulation' }}
              >
                <SkipForward className="w-4 h-4" />
              </button>

              {/* Volume — hide slider on mobile (use system volume) */}
              {!isMobile() && (
                <div className="flex items-center group/vol">
                  <button onClick={toggleMute} className="player-btn">
                    <VolumeIcon className="w-5 h-5" />
                  </button>
                  <div className="w-0 group-hover/vol:w-20 overflow-hidden transition-all duration-200 flex items-center">
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={(e) => setVolumeLevel(parseFloat(e.target.value))}
                      className="player-volume-slider w-full"
                    />
                  </div>
                </div>
              )}

              {/* Mute icon only on mobile */}
              {isMobile() && (
                <button onClick={toggleMute} className="player-btn" style={{ touchAction: 'manipulation' }}>
                  <VolumeIcon className="w-5 h-5" />
                </button>
              )}

              {/* Time */}
              <span className="text-white/70 text-xs font-mono ml-1 select-none whitespace-nowrap">
                {formatTime(progress)}
                <span className="text-white/40 mx-1">/</span>
                {formatTime(duration)}
              </span>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-1">
              {/* Speed */}
              <div className="relative">
                <button
                  onClick={() => { setShowSpeedMenu(!showSpeedMenu); setShowSubMenu(false); }}
                  className="player-btn text-xs font-semibold min-w-[36px]"
                  style={{ touchAction: 'manipulation' }}
                >
                  {playbackSpeed === 1 ? <Settings className="w-4 h-4" /> : `${playbackSpeed}x`}
                </button>
                {showSpeedMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-dark-900/95 backdrop-blur-md border border-dark-700/50 rounded-lg py-1 shadow-xl min-w-[120px]">
                    <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-dark-500 font-semibold">Speed</div>
                    {PLAYBACK_SPEEDS.map((speed) => (
                      <button
                        key={speed}
                        onClick={() => changeSpeed(speed)}
                        className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between ${playbackSpeed === speed
                            ? 'text-primary-400 bg-primary-500/10'
                            : 'text-dark-200 hover:bg-dark-800 hover:text-white'
                          }`}
                        style={{ touchAction: 'manipulation' }}
                      >
                        <span>{speed}x</span>
                        {speed === 1 && <span className="text-[10px] text-dark-500">Normal</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Subtitles */}
              {subtitles && subtitles.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => { setShowSubMenu(!showSubMenu); setShowSpeedMenu(false); }}
                    className={`player-btn ${activeSubtitle ? 'text-primary-400' : ''}`}
                    style={{ touchAction: 'manipulation' }}
                  >
                    <Subtitles className="w-4 h-4" />
                  </button>
                  {showSubMenu && (
                    <div className="absolute bottom-full right-0 mb-2 bg-dark-900/95 backdrop-blur-md border border-dark-700/50 rounded-lg py-1 shadow-xl min-w-[140px]">
                      <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-dark-500 font-semibold">Subtitles</div>
                      <button
                        onClick={() => selectSubtitle(null)}
                        className={`w-full px-3 py-2 text-left text-sm transition-colors ${!activeSubtitle ? 'text-primary-400 bg-primary-500/10' : 'text-dark-200 hover:bg-dark-800 hover:text-white'
                          }`}
                        style={{ touchAction: 'manipulation' }}
                      >
                        Off
                      </button>
                      {subtitles.map((sub) => (
                        <button
                          key={sub.lang}
                          onClick={() => selectSubtitle(sub.lang)}
                          className={`w-full px-3 py-2 text-left text-sm transition-colors ${activeSubtitle === sub.lang ? 'text-primary-400 bg-primary-500/10' : 'text-dark-200 hover:bg-dark-800 hover:text-white'
                            }`}
                          style={{ touchAction: 'manipulation' }}
                        >
                          {sub.lang}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PiP — hide on mobile where it's not well supported */}
              {!isMobile() && typeof document !== 'undefined' && document.pictureInPictureEnabled && (
                <button onClick={togglePiP} className="player-btn">
                  <PictureInPicture2 className="w-4 h-4" />
                </button>
              )}

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="player-btn"
                style={{ touchAction: 'manipulation' }}
              >
                {isFullscreen
                  ? <Minimize className="w-5 h-5" />
                  : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard hint (desktop only) */}
      {!isMobile() && showControls && !isPlaying && !error && !isLoading && (
        <div className="absolute top-4 right-4 z-10">
          <div className="flex gap-2 text-[10px] text-white/30">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded">Space</kbd>
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded">F</kbd>
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded">M</kbd>
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded">&larr;&rarr;</kbd>
          </div>
        </div>
      )}
    </div>
  );
}