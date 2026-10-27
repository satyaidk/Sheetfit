/**
 * Real print photos used on the landing page.
 *
 * All are free to use under the Unsplash License or the Pexels License
 * (commercial use allowed, no attribution required). They are credited anyway,
 * in the page footer and in `src/assets/photos/CREDITS.md`. Photos with visible
 * third-party logos or copyrighted characters were deliberately not chosen.
 * Static imports give Next.js the dimensions and a blur placeholder.
 */

import type { StaticImageData } from "next/image";
import mugHeart from "@/assets/photos/mug-heart.jpg";
import teeCoffee from "@/assets/photos/tee-coffee.jpg";
import teeOnAir from "@/assets/photos/tee-on-air.jpg";
import teeLayers from "@/assets/photos/tee-layers.jpg";
import mugGrad from "@/assets/photos/mug-grad.jpg";
import teeBestMom from "@/assets/photos/tee-best-mom.jpg";
import toteDog from "@/assets/photos/tote-dog.jpg";
import phoneCases from "@/assets/photos/phone-cases.jpg";
import heatPressWorkshop from "@/assets/photos/heat-press-workshop.jpg";
import rollPrinter from "@/assets/photos/roll-printer.jpg";
import cmykLoupe from "@/assets/photos/cmyk-loupe.jpg";
import mugBlank from "@/assets/photos/mug-blank.jpg";
import heatPressBlackTee from "@/assets/photos/heat-press-black-tee.jpg";

export interface Photo {
  src: StaticImageData;
  alt: string;
  by: string;
  site: "Unsplash" | "Pexels";
  url: string;
}

const p = (src: StaticImageData, alt: string, by: string, site: Photo["site"], url: string): Photo => ({ src, alt, by, site, url });

export const PHOTOS = {
  mugHeart: p(mugHeart, "White ceramic mug printed with a black heart, on a yellow background", "Darrell Jonathan", "Unsplash", "https://unsplash.com/photos/eOG9EhD7PPA"),
  teeCoffee: p(teeCoffee, "White T-shirt with a full-colour coffee slogan print", "BANDAR BAANT", "Pexels", "https://www.pexels.com/photo/man-in-white-t-shirt-with-coffee-quote-37092621/"),
  teeOnAir: p(teeOnAir, "Black T-shirt with a bright red and white microphone print", "BANDAR BAANT", "Unsplash", "https://unsplash.com/photos/eX0SV3fS-QY"),
  teeLayers: p(teeLayers, "Black oversized T-shirt with an illustrated full-front print", "BANDAR BAANT", "Pexels", "https://www.pexels.com/photo/stylish-oversized-men-s-t-shirt-with-abstract-print-36942017/"),
  mugGrad: p(mugGrad, "Graduation mug with a colourful congratulations print on a blue background", "RDNE Stock project", "Pexels", "https://www.pexels.com/photo/a-graduation-themed-mug-7842513/"),
  teeBestMom: p(teeBestMom, "Woman holding up a white T-shirt printed with Best Mom Ever", "cottonbro studio", "Pexels", "https://www.pexels.com/photo/a-woman-looking-at-a-printed-white-t-shirt-6667014/"),
  toteDog: p(toteDog, "Canvas tote bag printed with orange lettering", "Jon Tyson", "Unsplash", "https://unsplash.com/photos/K9zFCQCJTUE"),
  phoneCases: p(phoneCases, "A row of phone cases with sublimated floral, marble and fruit patterns", "Burst", "Pexels", "https://www.pexels.com/photo/assorted-color-smartphone-cases-374117/"),
  heatPressWorkshop: p(heatPressWorkshop, "A printer pressing a transfer onto a white T-shirt with a heat press", "James Collington", "Pexels", "https://www.pexels.com/photo/man-printing-t-shirt-in-workshop-with-heat-press-33650428/"),
  rollPrinter: p(rollPrinter, "A roll printer printing a colourful dragon design", "Yara Solis Fuentes", "Pexels", "https://www.pexels.com/photo/colorful-dragon-design-on-printing-machine-40242209/"),
  cmykLoupe: p(cmykLoupe, "A linen tester loupe on a CMYK colour calibration chart", "Immo Wegmann", "Unsplash", "https://unsplash.com/photos/eWuUwZWuWvE"),
  mugBlank: p(mugBlank, "A plain white ceramic mug, ready for printing", "Mediamodifier", "Unsplash", "https://unsplash.com/photos/he_xuL-CyyI"),
  heatPressBlackTee: p(heatPressBlackTee, "A man preparing a black T-shirt on a heat press", "Dwayne joe", "Unsplash", "https://unsplash.com/photos/t41MnAiCz-c"),
} satisfies Record<string, Photo>;

export type PhotoKey = keyof typeof PHOTOS;
