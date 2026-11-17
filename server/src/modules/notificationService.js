export async function createNotifications(trx, rows) {
  const ids = [];
  for (const row of rows) {
    const [id] = await trx('notifications').insert(row);
    await trx('email_outbox').insert({ notification_id: id, next_attempt_at: new Date() });
    ids.push(id);
  }
  return ids;
}
