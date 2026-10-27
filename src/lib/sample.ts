/**
 * A generated sample sheet, so first-time visitors can try the editor without
 * finding files. The images are drawn on a canvas at load time (nothing is
 * downloaded) and deliberately cover the interesting cases: a transparent
 * round badge, an extremely wide wordmark, and a small low-resolution photo
 * that triggers the print-quality warning.
 *
 * A second page holds a 30 oz tumbler wrap, which needs A3: adding it opens
 * its own A3 page while page 1 stays A4, which shows how pages work.
 */

import { useEditor } from "@/store/editor-store";
import { loadAssetFromBlob } from "@/lib/image/image-loader";
import { printableRect } from "@/lib/layout/sheet-layout";
import { sampleDesign } from "@/lib/catalogue/sample-designs";
import { sampleDesignAsset } from "@/lib/editor-actions";

function canvasBlob(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, type: string) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  return new Promise<Blob>((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("Sample could not be drawn"))), type, 0.9),
  );
}

function drawBadge(ctx: CanvasRenderingContext2D) {
  const s = 1200;
  ctx.translate(s / 2, s / 2);
  ctx.fillStyle = "#1f3b6f";
  ctx.beginPath();
  ctx.arc(0, 0, 560, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#f2c14e";
  ctx.lineWidth = 34;
  ctx.beginPath();
  ctx.arc(0, 0, 470, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#f2c14e";
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 330, Math.sin(a) * 330, 36, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 230px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ACE", 0, 10);
  ctx.font = "600 70px sans-serif";
  ctx.fillText("PRINT CO.", 0, 190);
}

function drawWordmark(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#c0185a";
  ctx.font = "italic 900 300px sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("summer camp", 40, 300);
  ctx.fillStyle = "#16191c";
  ctx.fillRect(40, 500, 2320, 24);
}

function drawPhoto(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, 0, 200);
  g.addColorStop(0, "#7ec8e3");
  g.addColorStop(0.6, "#fbe3b0");
  g.addColorStop(1, "#3c7a4a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 300, 200);
  ctx.fillStyle = "#f6a01a";
  ctx.beginPath();
  ctx.arc(220, 70, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2b5d36";
  ctx.beginPath();
  ctx.moveTo(0, 200);
  ctx.lineTo(90, 110);
  ctx.lineTo(170, 200);
  ctx.fill();
}

let pending: Promise<void> | null = null;

/** Load the sample sheet. Concurrent calls share one load. */
export function loadSampleSheet(): Promise<void> {
  pending ??= buildSampleSheet().finally(() => {
    pending = null;
  });
  return pending;
}

async function buildSampleSheet() {
  const store = useEditor.getState();
  store.newProject();
  const [badge, wordmark, photo] = await Promise.all([
    canvasBlob(1200, 1200, drawBadge, "image/png").then((b) =>
      loadAssetFromBlob(b, { name: "badge-logo.png", mimeType: "image/png" }),
    ),
    canvasBlob(2400, 600, drawWordmark, "image/png").then((b) =>
      loadAssetFromBlob(b, { name: "wide-wordmark.png", mimeType: "image/png" }),
    ),
    canvasBlob(300, 200, drawPhoto, "image/jpeg").then((b) =>
      loadAssetFromBlob(b, { name: "small-photo.jpg", mimeType: "image/jpeg" }),
    ),
  ]);
  for (const a of [badge, wordmark, photo]) store.addAsset(a);
  const s = useEditor.getState();
  s.setProjectName("Sample sheet");
  s.setProcess("sublimation");
  s.setSheet("a4", null, "landscape");

  // Product templates at their real print sizes, filled with images.
  const slot = (productId: string, assetId: string | null, x: number, y: number) => {
    const id = useEditor.getState().addProductSlot(productId).designId!;
    if (assetId) useEditor.getState().fillSlot(id, assetId);
    useEditor.getState().moveDesigns([{ id, x, y }]);
    return id;
  };
  const area = printableRect(useEditor.getState().doc.page);
  const mug = slot("mug-11oz", wordmark.id, area.x, area.y);
  slot("magnet", photo.id, area.x + 226, area.y);
  const coaster = slot("coaster-square", badge.id, area.x, area.y + 92);
  slot("coaster-square", badge.id, area.x + 112, area.y + 92);
  slot("pet-tag", null, area.x + 224, area.y + 92);
  const st = useEditor.getState();
  st.updateDesign(coaster, { fillColor: "#eef2f7" });
  const logo = mug;

  // Page 2: a template too big for A4 gets its own A3 page.
  const tumbler = useEditor.getState().addProductSlot("tumbler-30oz");
  if (tumbler.designId && tumbler.newPage) {
    const d = useEditor.getState().doc.designs[0];
    const pattern = await sampleDesignAsset(sampleDesign(424242, "pattern"), { width: d.width, height: d.height });
    useEditor.getState().addAsset(pattern);
    useEditor.getState().fillSlot(tumbler.designId, pattern.id);
    useEditor.getState().updateDesign(tumbler.designId, { productColor: "#bfe6d4" });
    useEditor.getState().switchPage(0);
  }
  // The sample is a starting point, not an edit: clear history and dirty state.
  useEditor.setState((x) => ({
    past: [],
    future: [],
    pages: x.pages.map((p) => ({ ...p, past: [], future: [] })),
    selection: [logo],
    project: { ...x.project, dirty: false },
  }));
}
