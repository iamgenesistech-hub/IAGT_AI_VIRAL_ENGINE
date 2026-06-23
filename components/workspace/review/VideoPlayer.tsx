"use client";

interface VideoPlayerProps {
  previewUrl: string;
}

export function VideoPlayer({ previewUrl }: VideoPlayerProps) {
  return (
    <video className="w-full rounded border border-slate-800 bg-black" src={previewUrl} controls playsInline />
  );
}

export default VideoPlayer;
