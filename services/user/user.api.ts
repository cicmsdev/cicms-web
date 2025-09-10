
import api from "@/lib/axios";
import {
  ApiMessage,
  CreateUserDto,
  CreateUserSuccess,
  Role,
} from "@/lib/userTypes";

function handleError(error: any): never {
  const msg =
    error?.response?.data?.message ||
    error?.response?.statusText ||
    error?.message ||
    "Unexpected error";
  throw new Error(Array.isArray(msg) ? msg.join(", ") : msg);
}

// create a new user (admin)
export const createUser = async (
  payload: CreateUserDto
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
    const res = await api.get("/roles");
    return res.data;
  } catch (error) {
    handleError(error);
  }
};
