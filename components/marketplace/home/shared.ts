export type HomeProductRow = {
  _id: string;
  name: string;
  slug: string;
  images: string[];
  retailPrice: number;
  category: string;
  stock: number;
};

export type HomeHeroSlot = {
  product?: HomeProductRow;
  imageUrl: string;
};

export const isRemoteUrl = (url: string) => /^https?:\/\//i.test(url);

export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
}
