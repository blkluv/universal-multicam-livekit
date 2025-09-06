// /api/token.mjs
import crypto from 'node:crypto';

function b64url(input) {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return b.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export default async function handler(req, res) {
  // CORS بسيط (اختياري)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const { room = 'default-room', identity, name } = req.query || {};
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return res.status(500).json({ error: 'Missing LIVEKIT_API_KEY or LIVEKIT_API_SECRET' });
    }
    if (!room) return res.status(400).json({ error: 'room is required' });
    const userId = (identity || 'user-' + Math.random().toString(36).slice(2, 8)).toString();
    const displayName = (name || userId).toString();

    // JWT header & payload (مطابق لمتطلبات LiveKit)
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      iss: apiKey,          // API key
      sub: userId,          // هوية المستخدم (identity)
      name: displayName,    // اسم العرض
      nbf: now - 10,        // يُسمح قبل 10 ثواني هامش
      exp: now + 60 * 60,   // صالح لساعة
      video: {
        room,               // الغرفة
        roomJoin: true,
        canPublish: true,
        canSubscribe: true
      }
    };

    const encodedHeader = b64url(JSON.stringify(header));
    const encodedPayload = b64url(JSON.stringify(payload));
    const toSign = `${encodedHeader}.${encodedPayload}`;
    const signature = b64url(crypto.createHmac('sha256', apiSecret).update(toSign).digest());

    const token = `${toSign}.${signature}`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(200).send(token); // نص JWT فقط
  } catch (e) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
