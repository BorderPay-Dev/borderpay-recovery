import type { PdfStyleAssets } from "./predeposit-pdf.ts";

// Static brand assets only. Never cache merchant logos, signatures or customer data.
const styles = new Map<string, Promise<PdfStyleAssets>>();
export async function loadPdfStyleAssets(db: any, variant: "mark" | "black-wordmark" = "mark"): Promise<PdfStyleAssets> {
  if (!styles.has(variant)) {
    styles.set(variant, (async () => {
      const read = async (name: string) => {
        const r = await db.storage.from("predeposit-render-assets").download(name);
        if (r.error || !r.data) throw Error("Invoice design assets are temporarily unavailable");
        return new Uint8Array(await r.data.arrayBuffer());
      };
      const [boldFontBytes, brandLogo] = await Promise.all([read("NotoSans-Bold.ttf"), read(variant === "black-wordmark" ? "borderpay-velocity-black.png" : "borderpay-mark.jpg")]);
      return { boldFontBytes, brandLogo };
    })().catch(error => { styles.delete(variant); throw error; }));
  }
  return styles.get(variant)!;
}
