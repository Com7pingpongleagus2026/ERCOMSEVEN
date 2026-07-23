// server.js — Werewolf Card Dealer (Express + WebSocket)
const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ===== ข้อมูลห้องเก็บใน memory =====
const rooms = new Map(); // roomCode -> { host, password, roles[], players[], dealt:bool }

// สร้างรหัสห้อง 4 หลัก
function genCode() {
  let code;
  do { code = String(Math.floor(1000 + Math.random() * 9000)); } while (rooms.has(code));
  return code;
}

// ===== REST API =====
// สร้างห้อง (host)
app.post('/api/create', (req, res) => {
  const { hostName, password } = req.body;
  if (!hostName || !password) return res.status(400).json({ error: 'ต้องระบุชื่อและรหัสห้อง' });
  const code = genCode();
  rooms.set(code, { host: hostName, password, roles: [], players: [], dealt: false, hostWs: null });
  res.json({ code });
});

// เข้าห้อง (player)
app.post('/api/join', (req, res) => {
  const { code, playerName, password } = req.body;
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'ไม่พบห้องนี้' });
  if (room.password !== password) return res.status(403).json({ error: 'รหัสผ่านผิด' });
  if (room.players.find(p => p.name === playerName)) return res.status(409).json({ error: 'ชื่อนี้มีคนใช้แล้ว' });
  room.players.push({ name: playerName, ws: null, role: null });
  broadcast(code, { type: 'playerJoined', players: room.players.map(p => p.name) });
  res.json({ ok: true });
});

// Host: ตั้งบทบาท
app.post('/api/roles', (req, res) => {
  const { code, roles } = req.body;
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'ไม่พบห้อง' });
  room.roles = roles; // [{name:'Werewolf',count:2},{name:'Seer',count:1},...]
  res.json({ ok: true });
});

// Host: สุ่มแจกการ์ด
app.post('/api/deal', (req, res) => {
  const { code } = req.body;
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'ไม่พบห้อง' });
  // สร้าง deck จาก roles
  const deck = [];
  room.roles.forEach(r => { for (let i = 0; i < r.count; i++) deck.push(r.name); });
  if (deck.length !== room.players.length) return res.status(400).json({ error: `จำนวนการ์ด (${deck.length}) ≠ ผู้เล่น (${room.players.length})` });
  // สุ่ม Fisher-Yates
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  // แจก
  room.players.forEach((p, i) => { p.role = deck[i]; });
  room.dealt = true;
  // ส่ง WebSocket ให้แต่ละคนเห็นการ์ดตัวเอง
  room.players.forEach(p => {
    if (p.ws && p.ws.readyState === 1) {
      p.ws.send(JSON.stringify({ type: 'cardDealt', role: p.role }));
    }
  });
  // ส่งให้ host รู้ว่าแจกแล้ว + ใครได้อะไร
  if (room.hostWs && room.hostWs.readyState === 1) {
    room.hostWs.send(JSON.stringify({ type: 'dealt', assignments: room.players.map(p => ({ name: p.name, role: p.role })) }));
  }
  // ส่งให้ผู้เล่นรู้ว่าแจกแล้ว (ไม่ส่ง assignments ให้ผู้เล่น)
  room.players.forEach(p => { if (p.ws && p.ws.readyState === 1) p.ws.send(JSON.stringify({ type: 'dealt' })); });
  res.json({ ok: true });
});

// Reset room
app.post('/api/reset', (req, res) => {
  const { code } = req.body;
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'ไม่พบห้อง' });
  room.dealt = false;
  room.players.forEach(p => { p.role = null; });
  broadcast(code, { type: 'reset' });
  res.json({ ok: true });
});

// ดูผู้เล่นในห้อง
app.get('/api/room/:code', (req, res) => {
  const room = rooms.get(req.params.code);
  if (!room) return res.status(404).json({ error: 'ไม่พบห้อง' });
  res.json({ host: room.host, players: room.players.map(p => p.name), dealt: room.dealt, roles: room.roles });
});

// GM ดูผลการแจก (ใครได้บทบาทอะไร)
app.get('/api/room/:code/assignments', (req, res) => {
  const room = rooms.get(req.params.code);
  if (!room) return res.status(404).json({ error: 'ไม่พบห้อง' });
  if (!room.dealt) return res.json({ assignments: [] });
  res.json({ assignments: room.players.map(p => ({ name: p.name, role: p.role })) });
});

// ===== WebSocket — realtime updates =====
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const code = url.searchParams.get('code');
  const name = url.searchParams.get('name');
  const isHost = url.searchParams.get('host') === '1';
  const room = rooms.get(code);
  if (!room) { ws.close(); return; }
  if (isHost) {
    room.hostWs = ws;
    // ถ้าแจกแล้ว ส่งผลให้ host ทันที
    if (room.dealt) {
      ws.send(JSON.stringify({ type: 'dealt', assignments: room.players.map(p => ({ name: p.name, role: p.role })) }));
    }
    ws.on('close', () => { room.hostWs = null; });
    return;
  }
  const player = room.players.find(p => p.name === name);
  if (player) player.ws = ws;
  // ถ้าแจกแล้ว ส่งการ์ดให้ทันที
  if (room.dealt && player && player.role) {
    ws.send(JSON.stringify({ type: 'cardDealt', role: player.role }));
  }
  ws.on('close', () => { if (player) player.ws = null; });
});

function broadcast(code, msg) {
  const room = rooms.get(code);
  if (!room) return;
  const data = JSON.stringify(msg);
  room.players.forEach(p => { if (p.ws && p.ws.readyState === 1) p.ws.send(data); });
  if (room.hostWs && room.hostWs.readyState === 1) room.hostWs.send(data);
}

// ===== Start =====
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🐺 Werewolf Cards running on port ${PORT}`));
