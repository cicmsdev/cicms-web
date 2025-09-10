export interface Insurance {
  companyId: string;            // Prisma uses this for relations
  name: string;
  email: string;
  policyNumberPrefix: string;
  createdAt: string;            // ISO timestamps from API
  updatedAt: string;
  deletedAt?: string | null;    // if you soft-delete
}

export type CreateInsurance = {
  name: string;
  email: string;
  policyNumberPrefix: string;
};

export type UpdateInsurance = Partial<CreateInsurance>;
