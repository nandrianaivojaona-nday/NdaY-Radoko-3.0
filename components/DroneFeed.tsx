import React, { useState } from 'react';

export const DroneFeed: React.FC = () => {
  const [status, setStatus] = useState<'connecting' | 'live' | 'error'>('connecting');

  const handlePlay = () => setStatus('live');
  const handleError = () => setStatus('error');

  return (
    <div className={`rounded-xl border p-3 mb-4 transition-colors ${
      status === 'error' ? 'border-status-red/40 bg-status-red/5' : 'border-brand-primary/25 bg-brand-background/40'
    }`}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wide text-brand-primary">
          Live Drone Camera Feed (Bench)
        </p>
        <span className={`badge text-[10px] ${
          status === 'live' ? 'bg-brand-mint/15 text-brand-mint animate-pulse' :
          status === 'connecting' ? 'bg-status-yellow/15 text-status-yellow animate-pulse' :
          'bg-status-red/15 text-status-red'
        }`}>
          {status === 'live' ? '● Live' : status === 'connecting' ? '○ Connecting...' : '✕ Offline'}
        </span>
      </div>

      <div className="overflow-hidden rounded-lg bg-black aspect-video relative flex items-center justify-center">
        {status === 'error' ? (
          <div className="p-4 text-center">
            <p className="text-sm font-bold text-white mb-2">Stream Not Found</p>
            <p className="text-xs text-gray-400 mb-2">
              Ensure the media server is running and the DJI remote controller is sending the stream.
            </p>
            <code className="text-[10px] bg-black/50 p-1 rounded text-status-red">
              rtmp://YOUR_IP:1935/live/drone
            </code>
          </div>
        ) : (
          <video
            className={`h-full w-full object-cover ${status === 'connecting' ? 'opacity-50' : 'opacity-100'}`}
            autoPlay
            muted
            playsInline
            controls
            src="http://localhost:8000/live/drone/index.m3u8"
            onPlay={handlePlay}
            onError={handleError}
          >
            Your browser does not support the video tag. Use Safari for HLS playback.
          </video>
        )}
      </div>
      
      <p className="mt-2 text-[10px] text-brand-text-secondary">
        Source: DJI Mini 3 · Synthetic target · Research only. Not a validated medical device.
      </p>
    </div>
  );
};
