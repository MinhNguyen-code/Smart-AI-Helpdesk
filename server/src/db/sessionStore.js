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
}
