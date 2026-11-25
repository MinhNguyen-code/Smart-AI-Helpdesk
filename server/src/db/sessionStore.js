import session from 'express-session';
import { db } from './index.js';

export class DatabaseSessionStore extends session.Store {
  constructor(database = db) {
    super();
    this.database = database;
  }

  get(id, callback) {
    this.database('sessions').where({ session_id: id }).where('expires', '>', Date.now()).first()
      .then(row => callback(null, row ? JSON.parse(row.data) : null)).catch(callback);
  }

  set(id, value, callback = () => {}) {
    const expires = value.cookie?.expires ? new Date(value.cookie.expires).getTime() : Date.now() + 86400000;
    this.database('sessions').insert({ session_id: id, expires, data: JSON.stringify(value) })
      .onConflict('session_id').merge().then(() => callback()).catch(callback);
  }

  destroy(id, callback = () => {}) {
    this.database('sessions').where({ session_id: id }).delete().then(() => callback()).catch(callback);
  }

  async pruneExpired(cutoff = Date.now()) {
    if (!Number.isSafeInteger(cutoff) || cutoff < 0) throw new RangeError('Invalid session cleanup cutoff');
    let removed = 0;
    for (let batch = 0; batch < 10; batch += 1) {
      const ids = await this.database('sessions').where('expires', '<=', cutoff)
        .orderBy('expires').limit(500).pluck('session_id');
      if (!ids.length) break;
      // A concurrent renewal can move expires forward after the selection.
      removed += await this.database('sessions').whereIn('session_id', ids)
        .where('expires', '<=', cutoff).delete();
      if (ids.length < 500) break;
    }
    return removed;
  }
}
