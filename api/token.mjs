// /api/token.mjs
import { AccessToken } from 'livekit-server-sdk';

export default async function handler(req, res) {
  try {
    const { room, identity, name, canPublish, canSubscribe } = req.query || {};
    if (!room || !identity) {
      res.status(400).json({ error: 'room and identity are required' });
      return;
    }

    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity,
        name: name || identity,
        ttl: '1h', // أو رقم بالثواني
      }
    );

    at.addGrant({
      roomJoin: true,
      room,
      // يمكن ضبط الصلاحيات من الاستعلام إن رغبت
      canPublish: canPublish !== 'false',
      canSubscribe: canSubscribe !== 'false',
    });

    const token = await at.toJwt(); // v2: async
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(token);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
