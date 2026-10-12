/**
 * Outgoing SMS and email. The rest of the server only calls send(); which company
 * delivers the message is a driver chosen in the settings (MESSAGING_DRIVER).
 *
 *   dev   prints the message in the server log and keeps its text in the outbox table, so
 *         codes and links can be read while developing and testing. Nothing leaves the server.
 *
 * Real drivers (an Egyptian SMS gateway, an email service) plug in here once chosen.
 */
'use strict';

const TEMPLATES = {
  signin_code: {
    en: (p) => `Your Mosta3lem code is ${p.code}. It expires in ${p.minutes} minutes. Do not share it with anyone.`,
    ar: (p) => `رمز الدخول إلى مستعلم هو ${p.code}. ينتهي خلال ${p.minutes} دقائق. لا تشاركه مع أحد.`
  },
  signup_code: {
    en: (p) => `Your Mosta3lem sign-up code is ${p.code}. It expires in ${p.minutes} minutes.`,
    ar: (p) => `رمز التسجيل في مستعلم هو ${p.code}. ينتهي خلال ${p.minutes} دقائق.`
  },
  invite: {
    en: (p) => `Hello ${p.name}, an account was opened for you on Mosta3lem. Choose your password here: ${p.link} (valid ${p.hours} hours).`,
    ar: (p) => `مرحبا ${p.name}، تم فتح حساب لك على مستعلم. اختر كلمة المرور من هنا: ${p.link} (صالح ${p.hours} ساعة).`
  },
  notice: {
    en: (p) => `Mosta3lem: ${p.text}`,
    ar: (p) => `مستعلم: ${p.text}`
  },
  // An alert to the people who run the platform (ALERT_EMAILS); always in English.
  alert: {
    en: (p) => `Mosta3lem alert (${p.server}): ${p.text}`,
    ar: (p) => `Mosta3lem alert (${p.server}): ${p.text}`
  },
  // The daily summary: the engine writes the whole text (digest.* translations).
  digest: {
    en: (p) => p.text,
    ar: (p) => p.text
  },
  reset: {
    en: (p) => `Hello ${p.name}, choose a new Mosta3lem password here: ${p.link} (valid ${p.hours} hours). If you did not ask for this, ignore this message.`,
    ar: (p) => `مرحبا ${p.name}، اختر كلمة مرور جديدة لمستعلم من هنا: ${p.link} (صالح ${p.hours} ساعة). إذا لم تطلب ذلك فتجاهل هذه الرسالة.`
  }
};

function createMessenger({ driver, db, log }) {
  if (driver !== 'dev') throw new Error(`Unknown MESSAGING_DRIVER "${driver}". Available: dev.`);

  return {
    driver,
    /** Send one message. channel: sms | email. */
    async send(channel, to, template, params, lang) {
      const t = TEMPLATES[template];
      if (!t) throw new Error('Unknown message template ' + template);
      const body = (t[lang] || t.en)(params);
      await db.query(
        'INSERT INTO outbox (channel, destination, template, body, sent_at) VALUES ($1, $2, $3, $4, now())',
        [channel, to, template, body]
      );
      log.info({ channel, to, template }, '[dev messenger] ' + body);
    }
  };
}

module.exports = { createMessenger, TEMPLATES };
