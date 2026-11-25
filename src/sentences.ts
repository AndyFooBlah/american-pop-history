// Shared by the page (highlighting) and scripts/render-narration.mjs (timings), so the two always agree.
// Not after an abbreviation: "Brown v. Board", "W.C. Handy".
export const sentences = (t: string) => t.split(/(?<=[.!?]["”]?)(?<!\b(?:Jr|Mr|Dr|St|W\.C|E\.Y|feat|v)\.)(?<!\s[A-Z]\.)\s+(?=[A-Z"“'])/);
