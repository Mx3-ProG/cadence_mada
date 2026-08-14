export type SharePayload = {
  title: string;
  text: string;
  url: string;
};

function completeMessage({ text, url }: SharePayload) {
  return `${text}\n${url}`;
}

export function shareOnWhatsApp(payload: SharePayload) {
  window.open(
    `https://wa.me/?text=${encodeURIComponent(completeMessage(payload))}`,
    "_blank",
    "noopener,noreferrer",
  );
}

export function shareBySms(payload: SharePayload) {
  window.location.href = `sms:?body=${encodeURIComponent(completeMessage(payload))}`;
}

/** Ouvre la feuille de partage du téléphone, qui donne accès aux applications installées. */
export async function shareNatively(payload: SharePayload) {
  if (!navigator.share) return false;
  try {
    await navigator.share(payload);
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return true;
    return false;
  }
}
