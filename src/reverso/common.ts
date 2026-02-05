function extractBlueWordText(wordEl: Element | null): string | null {
  if (!wordEl) {
    return null;
  }

  const text = Array.from(wordEl.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent ?? "")
    .join("")
    .replace(/\s+/g, " ")
    .trim();

  return text || null;
}

function extractWordFromUrl(): string | null {
  const match = window.location.pathname.match(/\/english-definition\/([^/]+)/);
  if (match) {
    return decodeURIComponent(match[1]).replace(/[+_]/g, " ");
  }
  return null;
}

/**
 * Get the current word/phrase from the page
 */
export function getCurrentWord(): string | null {
  // Prefer the actual word shown on the page (source of truth),
  // since the input/URL can temporarily reflect partial queries.
  const blueWord = document.querySelector(".definition-list__blue-word");
  const extracted = extractBlueWordText(blueWord);
  if (extracted) {
    return extracted;
  }

  // Fallback: try to get from URL
  return extractWordFromUrl();
}
