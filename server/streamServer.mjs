import NodeMediaServer from 'node-media-server';

const config = {
  rtmp: { port: 1935, chunk_size: 60000, gop_cache: true, ping: 30, ping_timeout: 60 },
  http: { port: 8000, allow_origin: '*' },
};

const nms = new NodeMediaServer(config);
nms.run();

console.log('\n[stream] RTMP server listening on port 1935');
console.log('[stream] Point DJI Fly to: rtmp://YOUR_MAC_IP:1935/live/drone');
console.log('[stream] App will play: http://localhost:8000/live/drone/index.m3u8\n');
