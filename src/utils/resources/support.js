// T-159: the one WhatsApp number that reaches the Mercampus team. It used to
// be hardcoded in three pages as two different numbers (/antojos/pqrs had
// this one; /antojos/game and the seller "approving" screen had 3197139921),
// so "talk to support" reached a different phone depending on the screen.
// The human confirmed this one as current on 2026-09-25.
//
// Country code included and no '+': that is the form wa.me documents.
// Not a secret and not per-environment, so a constant rather than an env var.
export const SUPPORT_WHATSAPP_NUMBER = '573054213899';

export const supportWhatsAppUrl = text =>
  `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
