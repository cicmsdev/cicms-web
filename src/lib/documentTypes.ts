// Keep values in sync with your Prisma enum
export type DocumentType =
  | "DAMAGE_REPORT"
  | "POLICE_REPORT"
  | "SITE_INSPECTION_REPORT"
  | "LAND_OWNERSHIP_PROOF";

export interface Document {
  documentId: string;
  documentType: DocumentType;
  filePath: string;        
  claimId: string;
  uploaderId: string;
  createdAt: string;       
  updatedAt: string;       

  
  claim?: any;
  uploader?: any;
}

export type CreateDocumentInput = {
  documentType: DocumentType;
  claimId: string;
  file: File;
};

export type UpdateDocumentInput = {
  documentType?: DocumentType;
  file?: File;             
  filePath?: string;
};
