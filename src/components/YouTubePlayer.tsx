import React from "react";

interface YouTubePlayerProps {
  videoId: string;
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ videoId }) => {
  return (
    <div className="relative w-full overflow-hidden rounded-lg" style={{ paddingTop: "56.25%" }}> {/* 16:9 Aspect Ratio */}
      <iframe
        className="absolute top-0 left-0 w-full h-full"
        src={`https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1&modestbranding=1&rel=0`}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="YouTube video player"
      ></iframe>
    </div>
  );
};

export default YouTubePlayer;
