import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { toast } from "sonner";

interface Mezmur {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  lyrics: string | null;
  downloadable: boolean;
  category_id: string | null;
}

interface AudioPlayerContextType {
  currentMezmur: Mezmur | null;
  setCurrentMezmur: (mezmur: Mezmur | null) => void;
  isPlaying: boolean;
  playMezmur: (mezmur: Mezmur) => void;
  pauseMezmur: () => void;
  togglePlayPause: () => void;
  audioRef: React.RefObject<HTMLAudioElement>;
  progress: number;
  duration: number;
  currentTime: number;
  volume: number;
  setVolume: (volume: number) => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(
  undefined,
);

export const AudioPlayerProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [currentMezmur, setCurrentMezmur] = useState<Mezmur | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolumeState] = useState(0.7); // Default volume
  const audioRef = useRef<HTMLAudioElement>(null);

  const playMezmur = useCallback((mezmur: Mezmur) => {
    if (audioRef.current) {
      if (currentMezmur?.id !== mezmur.id) {
        // Stop current and load new mezmur
        audioRef.current.pause();
        audioRef.current.src = mezmur.audio_url;
        setCurrentMezmur(mezmur);
        setIsPlaying(false); // Will be set to true on play
        setProgress(0);
        setCurrentTime(0);
        setDuration(0);
        console.log(`Loading new mezmur: ${mezmur.title}`);
      }
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          toast.success(`Now Playing: ${mezmur.title}`);
          console.log(`Started playing: ${mezmur.title}`);
        })
        .catch((e) => {
          toast.error("Failed to play audio. Check URL or browser policies.");
          console.error("Audio playback error:", e);
          setIsPlaying(false);
          setCurrentMezmur(null);
        });
    } else {
      console.error("Audio ref is not available.");
      toast.error("Audio player not initialized.");
    }
  }, [currentMezmur]);

  const pauseMezmur = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      console.log(`Paused: ${currentMezmur?.title}`);
    }
  }, [currentMezmur]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pauseMezmur();
    } else if (currentMezmur) {
      playMezmur(currentMezmur);
    }
  }, [isPlaying, currentMezmur, playMezmur, pauseMezmur]);

  const setVolume = useCallback((newVolume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      setVolumeState(newVolume);
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
    };

    const setAudioTime = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100 || 0);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      console.log(`Audio ended: ${currentMezmur?.title}`);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      console.log(`Loaded metadata for: ${currentMezmur?.title}`);
    };

    const handleVolumeChange = () => {
      setVolumeState(audio.volume);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", setAudioTime);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("canplay", setAudioData);
    audio.addEventListener("volumechange", handleVolumeChange);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", setAudioTime);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("canplay", setAudioData);
      audio.removeEventListener("volumechange", handleVolumeChange);
    };
  }, [currentMezmur]); // Re-attach listeners if currentMezmur changes

  // Set initial volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [audioRef, volume]);


  const value = {
    currentMezmur,
    setCurrentMezmur,
    isPlaying,
    playMezmur,
    pauseMezmur,
    togglePlayPause,
    audioRef,
    progress,
    duration,
    currentTime,
    volume,
    setVolume,
  };

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
};

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (context === undefined) {
    throw new Error("useAudioPlayer must be used within an AudioPlayerProvider");
  }
  return context;
};
