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

export function shareByEmail(payload: SharePayload) {
  const url = `mailto:?subject=${encodeURIComponent(payload.title)}&body=${encodeURIComponent(completeMessage(payload))}`;
  window.location.href = url;
}

export function shareOnTwitter(payload: SharePayload) {
  window.open(
    `https://twitter.com/intent/tweet?url=${encodeURIComponent(payload.url)}&text=${encodeURIComponent(payload.text)}`,
    "_blank",
    "noopener,noreferrer",
  );
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
