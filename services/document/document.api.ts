import axios from "axios";
import { API_BASE_URL } from "../../src/lib/constants";
import type {
  Document,
  CreateDocumentInput,
  UpdateDocumentInput,
} from "../../src/lib/documentTypes";

/** GET /documents (optionally filter by claimId) */
export const listDocuments = async (claimId?: string): Promise<Document[]> => {
  try {
    const res = await axios.get(`${API_BASE_URL}/documents`, {
      params: claimId ? { claimId } : undefined,
    });
    return res.data; // may be [] or { data: [] } depending on your controller
  } catch (error: any) {
    console.error("Error listing documents:", error.response?.data || error.message);
    throw error.response?.data || { message: "Failed to list documents" };
  }
};

/** GET /documents/:documentId */
export const getDocument = async (documentId: string): Promise<Document> => {
  try {
    const res = await axios.get(`${API_BASE_URL}/documents/${documentId}`);
    return res.data;
  } catch (error: any) {
    console.error("Error fetching document:", error.response?.data || error.message);
    throw error.response?.data || { message: "Failed to fetch document" };
  }
};

///POST /documents  
export const createDocument = async (input: CreateDocumentInput): Promise<Document> => {
  try {
    const fd = new FormData();
    fd.append("documentType", input.documentType);
    fd.append("claimId", input.claimId);
    fd.append("file", input.file);

    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

    const res = await axios.post(`${API_BASE_URL}/documents`, fd, {
      withCredentials: true,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    return res.data?.data ?? res.data;
  } catch (error: any) {
    console.error("Error creating document:", error.response?.data || error.message);
    throw error.response?.data || { message: "Failed to create document" };
  }
};

/** PATCH /documents/:documentId  (multipart/form-data even if no file) */
export const updateDocument = async (
  documentId: string,
  input: UpdateDocumentInput
): Promise<Document> => {
  try {
    const fd = new FormData();
    if (input.documentType) fd.append("documentType", input.documentType);
    if (input.filePath) fd.append("filePath", input.filePath);
    if (input.file) fd.append("file", input.file);

    const res = await axios.patch(`${API_BASE_URL}/documents/${documentId}`, fd);
    return res.data;
  } catch (error: any) {
    console.error("Error updating document:", error.response?.data || error.message);
    throw error.response?.data || { message: "Failed to update document" };
  }
};

/** DELETE /documents/:documentId */
export const deleteDocument = async (
  documentId: string
): Promise<{ message?: string }> => {
  try {
    const res = await axios.delete(`${API_BASE_URL}/documents/${documentId}`);
    return res.data;
  } catch (error: any) {
    console.error("Error deleting document:", error.response?.data || error.message);
    throw error.response?.data || { message: "Failed to delete document" };
  }
};

/** GET /documents/:documentId/download  -> Blob + filename */
export const downloadDocument = async (
  documentId: string
): Promise<{ blob: Blob; filename: string; contentType: string }> => {
  try {
    const res = await axios.get(`${API_BASE_URL}/documents/${documentId}/download`, {
      responseType: "blob",
    });

    const disposition = res.headers["content-disposition"] || "";
    const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(disposition);
    const filename = match ? decodeURIComponent(match[1]) : "download";

    const contentType = res.headers["content-type"] || "application/octet-stream";

    return { blob: res.data as Blob, filename, contentType };
  } catch (error: any) {
    console.error("Error downloading document:", error.response?.data || error.message);
    throw error.response?.data || { message: "Failed to download document" };
  }
};
