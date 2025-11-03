import React, { useEffect, useState, useRef, useCallback } from "react";
import { useAudioPlayer } from "@/contexts/GlobalAudioPlayerContext";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  FastForward,
  Rewind,
  Music,
  X,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const PLAYER_POSITION_KEY = "audio_player_position";

const GlobalAudioPlayer: React.FC = () => {
  const {
    currentMezmur,
    isPlaying,
    togglePlayPause,
    audioRef,
    progress,
    duration,
    currentTime,
    volume,
    setVolume,
  } = useAudioPlayer();

  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(volume);
  const [isMinimized, setIsMinimized] = useState(false);
  const { setCurrentMezmur } = useAudioPlayer();

  const playerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(() => {
    if (typeof window !== "undefined") {
      const savedPosition = localStorage.getItem(PLAYER_POSITION_KEY);
      if (savedPosition) {
        return JSON.parse(savedPosition);
      }
    }
    // Default position for desktop (bottom-right), adjusted for player width/height
    // These values are rough estimates; actual position will be constrained by viewport
    return {
      x: window.innerWidth - 320 - 16,
      y: window.innerHeight - 180 - 16,
    };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      const seekTime = (value[0] / 100) * duration;
      audioRef.current.currentTime = seekTime;
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0] / 100;
    setVolume(newVolume);
    if (newVolume > 0) {
      setIsMuted(false);
      setPrevVolume(newVolume);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        const newVolume = prevVolume > 0 ? prevVolume : 0.7;
        audioRef.current.volume = newVolume;
        setVolume(newVolume);
        setIsMuted(false);
      } else {
        setPrevVolume(audioRef.current.volume);
        audioRef.current.volume = 0;
        setVolume(0);
        setIsMuted(true);
      }
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      setIsMuted(audioRef.current.volume === 0);
    }
  }, [volume, audioRef]);

  // Dragging logic
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only allow dragging from the top part of the player or a dedicated handle
      const target = e.target as HTMLElement;
      const isHandle = target.closest(".draggable-handle");

      if (playerRef.current && isHandle) {
        setIsDragging(true);
        const rect = playerRef.current.getBoundingClientRect();
        setOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
        e.preventDefault(); // Prevent text selection etc.
      }
    },
    [playerRef],
  ); // Add playerRef to dependencies

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      let newX = e.clientX - offset.x;
      let newY = e.clientY - offset.y;

      // Keep player within viewport
      const playerWidth = playerRef.current?.offsetWidth || 0;
      const playerHeight = playerRef.current?.offsetHeight || 0;

      newX = Math.max(0, Math.min(newX, window.innerWidth - playerWidth));
      newY = Math.max(0, Math.min(newY, window.innerHeight - playerHeight));

      setPosition({ x: newX, y: newY });
    },
    [isDragging, offset, playerRef], // Add playerRef to dependencies
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    localStorage.setItem(PLAYER_POSITION_KEY, JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    // Attach and clean up global mouse event listeners
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleRemove = () => {
    setCurrentMezmur(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  return (
    <Card
      ref={playerRef}
      className={cn(
        "z-50 flex flex-col rounded-b-lg shadow-lg w-full bg-background transition-all duration-300",
        "fixed top-[64px] left-0 right-0",
        "md:absolute md:rounded-md md:bottom-4 md:right-4 md:left-auto md:top-auto",
        currentMezmur ? "translate-y-0" : "-translate-y-[150%] md:translate-y-full",
        isMinimized ? "md:w-[200px] md:p-2" : "md:w-[320px] md:p-4",
        !isMinimized && "p-2"
      )}
      style={
        typeof window !== "undefined" && window.innerWidth >= 768
          ? { left: `${position.x}px`, top: `${position.y}px` }
          : {}
      }
    >
      {/* Hidden Audio Element for Global Control */}
      <audio ref={audioRef} />

      {currentMezmur && (
        <>
          {/* Draggable Handle + Controls */}
          <div className="flex items-center justify-between mb-2">
            <div
              className="draggable-handle flex-1 h-6 cursor-grab md:cursor-grab"
              onMouseDown={handleMouseDown}
            >
              <div className="w-12 h-1 bg-muted rounded-full mx-auto mt-2"></div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hidden md:flex"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleRemove}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {!isMinimized ? (
            <>
              {/* Full Player controls */}
              <div className="flex items-center justify-between w-full mb-1 md:mb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Music className="h-5 w-5 md:h-6 md:w-6 text-primary shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm md:text-base font-semibold truncate">
                      {currentMezmur.title}
                    </span>
                    <span className="text-xs md:text-sm text-muted-foreground truncate">
                      {currentMezmur.artist}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 md:h-8 md:w-8"
                    onClick={() => {
                      if (audioRef.current) {
                        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
                      }
                    }}
                  >
                    <Rewind className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8" onClick={togglePlayPause}>
                    {isPlaying ? (
                      <Pause className="h-5 w-5 md:h-6 md:w-6 fill-current" />
                    ) : (
                      <Play className="h-5 w-5 md:h-6 md:w-6 fill-current" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 md:h-8 md:w-8"
                    onClick={() => {
                      if (audioRef.current) {
                        audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10);
                      }
                    }}
                  >
                    <FastForward className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                </div>
                <div className="flex items-center gap-1 w-20 ml-2 md:w-24 md:ml-4">
                  <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8" onClick={toggleMute}>
                    {isMuted ? (
                      <VolumeX className="h-4 w-4 md:h-5 md:w-5" />
                    ) : (
                      <Volume2 className="h-4 w-4 md:h-5 md:w-5" />
                    )}
                  </Button>
                  <Slider
                    value={[isMuted ? 0 : volume * 100]}
                    max={100}
                    step={1}
                    onValueChange={handleVolumeChange}
                    className="w-full h-4"
                  />
                </div>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center gap-2 w-full mt-1 md:mt-2">
                <span className="text-[10px] md:text-xs text-muted-foreground">{formatTime(currentTime)}</span>
                <Slider value={[progress]} max={100} step={0.1} onValueChange={handleSeek} className="w-full h-4" />
                <span className="text-[10px] md:text-xs text-muted-foreground">{formatTime(duration)}</span>
              </div>
            </>
          ) : (
            /* Minimized Player */
            <div className="flex items-center gap-2 w-full">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={togglePlayPause}>
                {isPlaying ? (
                  <Pause className="h-5 w-5 fill-current" />
                ) : (
                  <Play className="h-5 w-5 fill-current" />
                )}
              </Button>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-semibold truncate">{currentMezmur.title}</span>
                <span className="text-[10px] text-muted-foreground truncate">{currentMezmur.artist}</span>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default GlobalAudioPlayer;
