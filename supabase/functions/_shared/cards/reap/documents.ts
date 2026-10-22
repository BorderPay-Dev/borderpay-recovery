import { ContractError, contracts, validateSchema } from "./contracts.ts";
export interface CleanEvidence {
  file: File;
  scanStatus: "clean";
  sha256: string;
}
export interface KybUpload {
  businessEntityId: string;
  documentType: string;
  individualEntityId?: string;
  uboDocumentType?: "PASSPORT" | "ID_CARD" | "DRIVERS_LICENCE";
  files: CleanEvidence[];
  existingFileCount: number;
}
const mimeByExtension: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  doc: "application/msword",
  docx:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  csv: "text/csv",
};
export async function prepareKybUpload(input: KybUpload) {
  validateSchema({ type: "string", format: "uuid" }, input.businessEntityId);
  const isUbo = input.documentType === "ubo-kyc";
  const schema = contracts.uploadKyb.body.content["multipart/form-data"].schema;
  validateSchema(schema.properties.documentType, input.documentType);
  if (
    !Number.isSafeInteger(input.existingFileCount) ||
    input.existingFileCount < 0 || !input.files.length ||
    input.files.length > (isUbo ? 2 : 5) ||
    input.existingFileCount + input.files.length > 20
  ) throw new ContractError(["file_count"]);
  if (isUbo) {
    validateSchema(
      { type: "string", format: "uuid" },
      input.individualEntityId,
    );
    validateSchema(schema.properties.uboDocumentType, input.uboDocumentType);
  } else if (
    input.individualEntityId !== undefined ||
    input.uboDocumentType !== undefined
  ) throw new ContractError(["ubo_fields"]);
  const form = new FormData();
  form.set("documentType", input.documentType);
  if (isUbo) {
    form.set("individualEntityId", input.individualEntityId!);
    form.set("uboDocumentType", input.uboDocumentType!);
  }
  const hashes: string[] = [];
  for (const evidence of input.files) {
    const file = evidence.file;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (
      evidence.scanStatus !== "clean" || !(file instanceof File) ||
      file.size < 1 || file.size > 10 * 1024 * 1024 ||
      mimeByExtension[ext] !== file.type ||
      (isUbo && !["pdf", "jpg", "jpeg", "png"].includes(ext))
    ) throw new ContractError(["clean_supported_document_required"]);
    const bytes = await file.arrayBuffer();
    const hash = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
      (b) => b.toString(16).padStart(2, "0"),
    ).join("");
    if (hash !== evidence.sha256) {
      throw new ContractError(["document_changed_since_scan"]);
    }
    // Preserve ordered front/back; no URL fetch, filename-based path or identity logs.
    form.append("files", file, `evidence-${hash.slice(0, 16)}.${ext}`);
    hashes.push(hash);
  }
  return {
    path: `/entity/${input.businessEntityId}/ukyb/documents`,
    body: form,
    hashes,
  };
}
