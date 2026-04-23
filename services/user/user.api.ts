
import api from "@/lib/axios";
import {
  ApiMessage,
  CreateUserDto,
  CreateUserSuccess,
  Role,
} from "@/lib/userTypes";

export type UserListItem = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: { id: string; name: string } | string; // depends on your select/transform
  status: string;
  isDefaultPassword: boolean;
  lastLogin: string | null;
};

function handleError(error: any): never {
  const msg =
    error?.response?.data?.message ||
    error?.response?.statusText ||
    error?.message ||
    "Unexpected error";
  throw new Error(Array.isArray(msg) ? msg.join(", ") : msg);
}



export type UsersPage = {
  items: UserListItem[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
};

export type UsersQuery = {
  q?: string;
  roleId?: string;
  status?: string;
  defaultPw?: boolean;
  page?: number;
  pageSize?: number;
  sort?: string; // 'name:asc'
};

const toParams = (q: UsersQuery) => {
  const params = new URLSearchParams();
  if (q.q) params.set("q", q.q);
  if (q.roleId) params.set("roleId", q.roleId);
  if (q.status) params.set("status", q.status);
  if (typeof q.defaultPw === "boolean") params.set("defaultPw", String(q.defaultPw));
  if (q.page) params.set("page", String(q.page));
  if (q.pageSize) params.set("pageSize", String(q.pageSize));
  if (q.sort) params.set("sort", q.sort);
  return params;
};


// create a new user 
// 🔒 Claim Manager only
export const createUser = async (
  payload: any 
): Promise<ApiMessage<CreateUserSuccess>> => {
  try {
    const res = await api.post("/users/create", payload);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// create a new contractor 
export const createContractor = async (
  payload: Omit<CreateUserDto, "role_id">
): Promise<ApiMessage> => {
  try {
    const res = await api.post("/users/create-contractor", payload);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

/** GET /roles (if you expose a roles endpoint) */
export const getRoles = async (): Promise<Role[]> => {
  try {
    const res = await api.get("/roles/all");
    return res.data?.data ?? [];  
  } catch (error) {
    handleError(error);
  }
};

// GET /users (claim manager)
export async function listUsers(q: UsersQuery): Promise<UsersPage> {
  const res = await api.get(`/users`, { params: Object.fromEntries(toParams(q)) });
  return res.data;
}





