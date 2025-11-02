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

  return (
    <Card
      ref={playerRef}
      className={cn(
        "z-50 flex flex-col p-2 rounded-b-lg shadow-lg w-full bg-background transition-transform duration-300",
        // Mobile styles: fixed top, full width, rounded-b-lg
        "fixed top-[64px] left-0 right-0", // Adjusted to be below the navbar (h-16 = 64px)
        // Desktop styles: absolute, draggable, fixed width and dynamic position, rounded-md
        "md:absolute md:w-[320px] md:rounded-md md:p-4 md:bottom-4 md:right-4 md:left-auto md:top-auto md:cursor-grab",
        currentMezmur
          ? "translate-y-0"
          : "-translate-y-[150%] md:translate-y-full", // Hide at top for mobile, bottom for desktop. Adjusted mobile hide value.
      )}
      style={
        typeof window !== "undefined" && window.innerWidth >= 768 // Apply absolute positioning only on desktop
          ? { left: `${position.x}px`, top: `${position.y}px` }
          : {}
      }
      // onMouseDown removed from Card, now only on handle
    >
      {/* Hidden Audio Element for Global Control */}
      <audio ref={audioRef} />

      {currentMezmur && (
        <>
          {/* Draggable Handle */}
          <div
            className="draggable-handle absolute top-0 left-0 right-0 h-8 md:h-6 cursor-grab -mt-2 md:-mt-4"
            onMouseDown={handleMouseDown} // Attach mousedown to a specific handle
          ></div>

          {/* Player controls row */}
          <div className="flex items-center justify-between w-full mb-1 md:mb-2 mt-4 md:mt-0">
            {" "}
            {/* Added mt-4 for mobile spacing around handle */}
            {/* Mezmur Info */}
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
            {/* Playback Controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 md:h-8 md:w-8"
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = Math.max(
                      0,
                      audioRef.current.currentTime - 10,
                    );
                  }
                }}
              >
                <Rewind className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 md:h-8 md:w-8"
                onClick={togglePlayPause}
              >
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
                    audioRef.current.currentTime = Math.min(
                      duration,
                      audioRef.current.currentTime + 10,
                    );
                  }
                }}
              >
                <FastForward className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </div>
            {/* Volume Control */}
            <div className="flex items-center gap-1 w-20 ml-2 md:w-24 md:ml-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 md:h-8 md:w-8"
                onClick={toggleMute}
              >
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
            <span className="text-[10px] md:text-xs text-muted-foreground">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[progress]}
              max={100}
              step={0.1}
              onValueChange={handleSeek}
              className="w-full h-4"
            />
            <span className="text-[10px] md:text-xs text-muted-foreground">
              {formatTime(duration)}
            </span>
          </div>
        </>
      )}
    </Card>
  );
};

export default GlobalAudioPlayer;
