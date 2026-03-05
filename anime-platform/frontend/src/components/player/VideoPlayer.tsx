'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { motion } from 'framer-motion';
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

export function VideoPlayer({ src, poster, title, headers, subtitles, onProgress }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekBarRef = useRef<HTMLDivElement>(null);

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
  const [seekPreview, setSeekPreview] = useState(0);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);
  const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null);
  const [showSubMenu, setShowSubMenu] = useState(false);

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
          ...(headers ? { xhrSetup: (xhr: XMLHttpRequest) => {
            Object.entries(headers).forEach(([key, value]) => {
              xhr.setRequestHeader(key, value);
            });
          }} : {}),
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

  // Set up subtitle tracks
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !subtitles?.length) return;

    // Remove existing tracks
    while (video.firstChild) {
      video.removeChild(video.firstChild);
    }

    // Find English subtitle by default
    const engSub = subtitles.find(
      (s) => s.lang.toLowerCase().includes('english') || s.lang.toLowerCase() === 'en'
    );

    subtitles.forEach((sub, idx) => {
      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.label = sub.lang;
      track.srclang = sub.lang.slice(0, 2).toLowerCase();
      track.src = sub.url;
      const isDefault = engSub ? sub === engSub : false;
      if (isDefault) {
        track.default = true;
      }
      video.appendChild(track);
    });

    // Set track modes after adding to DOM
    for (let i = 0; i < video.textTracks.length; i++) {
      const isEng = subtitles[i] && subtitles[i] === engSub;
      video.textTracks[i].mode = isEng ? 'showing' : 'hidden';
    }

    if (engSub) {
      setActiveSubtitle(engSub.lang);
    }
  }, [subtitles, src]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (!isSeeking) {
        setProgress(video.currentTime);
      }
      setDuration(video.duration);
      onProgress?.(video.currentTime, video.duration);
    };

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
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

  // Fullscreen listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;
      // Ignore if user is typing in an input
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
  }, [isPlaying]);

  // Auto-hide controls
  const flashControls = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
        setShowSpeedMenu(false);
      }
    }, 3000);
  }, []);

  const handleMouseMove = () => {
    flashControls();
  };

  const handleMouseLeave = () => {
    if (isPlaying && !isSeeking) {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSpeedMenu(false);
      }, 1000);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
    flashControls();
  };

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
    if (val === 0) {
      video.muted = true;
      setIsMuted(true);
    } else if (video.muted) {
      video.muted = false;
      setIsMuted(false);
    }
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    // Prevent double-click fullscreen from the controls area
    if ((e.target as HTMLElement).closest('[data-controls]')) return;
    toggleFullscreen();
  };

  const changeSpeed = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    flashControls();
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch {
      // PiP not supported
    }
  };

  const selectSubtitle = (lang: string | null) => {
    const video = videoRef.current;
    if (!video) return;
    for (let i = 0; i < video.textTracks.length; i++) {
      video.textTracks[i].mode = video.textTracks[i].label === lang ? 'showing' : 'hidden';
    }
    setActiveSubtitle(lang);
    setShowSubMenu(false);
  };

  // Seek bar interaction
  const handleSeekBarMouse = (e: React.MouseEvent, action: 'down' | 'move') => {
    const bar = seekBarRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const time = x * (duration || 0);

    if (action === 'down') {
      setIsSeeking(true);
      setSeekPreview(time);
      setProgress(time);

      const handleMouseMove = (ev: MouseEvent) => {
        const mx = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
        const mt = mx * (duration || 0);
        setSeekPreview(mt);
        setProgress(mt);
      };

      const handleMouseUp = (ev: MouseEvent) => {
        const ux = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
        const ut = ux * (duration || 0);
        if (videoRef.current) {
          videoRef.current.currentTime = ut;
        }
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
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={handleDoubleClick}
    >
      <video
        ref={videoRef}
        poster={poster}
        onClick={togglePlay}
        className="absolute inset-0 w-full h-full object-contain cursor-pointer"
        playsInline
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-[3px] border-white/10" />
            <Loader2 className="absolute inset-0 w-16 h-16 text-primary-400 animate-spin" />
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
          <div className="text-center max-w-md px-6">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <Play className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-red-400 text-lg font-semibold">{error}</p>
            <p className="text-dark-400 text-sm mt-2">
              Try refreshing the page or selecting a different episode.
            </p>
          </div>
        </div>
      )}

      {/* Center Play Button (when paused) */}
      {!isPlaying && !isLoading && !error && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center z-10"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="w-20 h-20 bg-primary-500/90 rounded-full flex items-center justify-center backdrop-blur-md shadow-2xl shadow-primary-500/30 hover:bg-primary-400 transition-all hover:scale-110"
          >
            <Play className="w-9 h-9 text-white ml-1" fill="white" />
          </motion.div>
        </button>
      )}

      {/* Bottom Controls Overlay */}
      <div
        data-controls
        className={`absolute bottom-0 left-0 right-0 z-20 transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        {/* Gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none" />

        <div className="relative px-4 pb-4 pt-12">
          {/* Title */}
          {title && (
            <p className="text-white/90 text-sm font-medium mb-3 drop-shadow-lg">{title}</p>
          )}

          {/* Seek Bar */}
          <div
            ref={seekBarRef}
            className="group/seek relative h-6 flex items-center cursor-pointer mb-2"
            onMouseDown={(e) => handleSeekBarMouse(e, 'down')}
            onMouseMove={(e) => handleSeekBarMouse(e, 'move')}
            onMouseLeave={() => setHoverTime(null)}
          >
            {/* Hover time tooltip */}
            {hoverTime !== null && !isSeeking && (
              <div
                className="absolute -top-8 px-2 py-1 bg-dark-900/95 rounded text-xs text-white font-medium pointer-events-none border border-dark-700/50 shadow-lg"
                style={{ left: `${hoverX}px`, transform: 'translateX(-50%)' }}
              >
                {formatTime(hoverTime)}
              </div>
            )}

            {/* Track background */}
            <div className="absolute left-0 right-0 h-1 group-hover/seek:h-1.5 bg-white/20 rounded-full transition-all overflow-hidden">
              {/* Buffered */}
              <div
                className="absolute inset-y-0 left-0 bg-white/30 rounded-full"
                style={{ width: `${bufferedPercent}%` }}
              />
              {/* Progress */}
              <div
                className="absolute inset-y-0 left-0 bg-primary-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Seek thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-primary-400 rounded-full shadow-lg shadow-primary-500/50 opacity-0 group-hover/seek:opacity-100 transition-opacity scale-0 group-hover/seek:scale-100 pointer-events-none"
              style={{ left: `calc(${progressPercent}% - 7px)` }}
            />
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between">
            {/* Left Controls */}
            <div className="flex items-center gap-1">
              {/* Play/Pause */}
              <button onClick={togglePlay} className="player-btn">
                {isPlaying ? (
                  <Pause className="w-5 h-5" fill="white" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" fill="white" />
                )}
              </button>

              {/* Skip Back */}
              <button onClick={() => skip(-10)} className="player-btn" title="Rewind 10s">
                <SkipBack className="w-4 h-4" />
              </button>

              {/* Skip Forward */}
              <button onClick={() => skip(10)} className="player-btn" title="Forward 10s">
                <SkipForward className="w-4 h-4" />
              </button>

              {/* Volume */}
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

              {/* Time */}
              <span className="text-white/70 text-xs font-mono ml-2 select-none">
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
                  className="player-btn text-xs font-semibold min-w-[40px]"
                  title="Playback speed"
                >
                  {playbackSpeed === 1 ? (
                    <Settings className="w-4 h-4" />
                  ) : (
                    `${playbackSpeed}x`
                  )}
                </button>
                {showSpeedMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-dark-900/95 backdrop-blur-md border border-dark-700/50 rounded-lg py-1 shadow-xl min-w-[120px]">
                    <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-dark-500 font-semibold">Speed</div>
                    {PLAYBACK_SPEEDS.map((speed) => (
                      <button
                        key={speed}
                        onClick={() => changeSpeed(speed)}
                        className={`w-full px-3 py-1.5 text-left text-sm transition-colors flex items-center justify-between ${
                          playbackSpeed === speed
                            ? 'text-primary-400 bg-primary-500/10'
                            : 'text-dark-200 hover:bg-dark-800 hover:text-white'
                        }`}
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
                    title="Subtitles"
                  >
                    <Subtitles className="w-4 h-4" />
                  </button>
                  {showSubMenu && (
                    <div className="absolute bottom-full right-0 mb-2 bg-dark-900/95 backdrop-blur-md border border-dark-700/50 rounded-lg py-1 shadow-xl min-w-[140px]">
                      <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-dark-500 font-semibold">Subtitles</div>
                      <button
                        onClick={() => selectSubtitle(null)}
                        className={`w-full px-3 py-1.5 text-left text-sm transition-colors ${
                          !activeSubtitle ? 'text-primary-400 bg-primary-500/10' : 'text-dark-200 hover:bg-dark-800 hover:text-white'
                        }`}
                      >
                        Off
                      </button>
                      {subtitles.map((sub) => (
                        <button
                          key={sub.lang}
                          onClick={() => selectSubtitle(sub.lang)}
                          className={`w-full px-3 py-1.5 text-left text-sm transition-colors ${
                            activeSubtitle === sub.lang ? 'text-primary-400 bg-primary-500/10' : 'text-dark-200 hover:bg-dark-800 hover:text-white'
                          }`}
                        >
                          {sub.lang}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PiP */}
              {typeof document !== 'undefined' && document.pictureInPictureEnabled && (
                <button onClick={togglePiP} className="player-btn" title="Picture in Picture">
                  <PictureInPicture2 className="w-4 h-4" />
                </button>
              )}

              {/* Fullscreen */}
              <button onClick={toggleFullscreen} className="player-btn" title="Fullscreen (F)">
                {isFullscreen ? (
                  <Minimize className="w-5 h-5" />
                ) : (
                  <Maximize className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard shortcut hint on first hover */}
      {showControls && !isPlaying && !error && !isLoading && (
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
