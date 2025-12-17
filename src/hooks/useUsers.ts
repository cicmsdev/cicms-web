// src/hooks/useUsers.ts
import { keepPreviousData, useMutation, useQuery, useQueryClient, } from "@tanstack/react-query";
import { createContractor, createUser, getRoles, listUsers } from "../../services/user/user.api";
import type { CreateUserDto, Role } from "@/lib/userTypes";
import type { UserListItem, UsersPage, UsersQuery } from "../../services/user/user.api";

export function useUsers(q: UsersQuery) {
  return useQuery<UsersPage>({
    queryKey: ["users", q],
    queryFn: () => listUsers(q),
    placeholderData: keepPreviousData, 
    staleTime: 10_000,
  });
}

export function useRoles() {
  return useQuery<Role[]>({
    queryKey: ["roles"],
    queryFn: getRoles,
    staleTime: 60_000,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserDto) => createUser(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users", "list"] });
    },
  });
}

export function useCreateContractor() {
  const qc = useQueryClient();
  return useMutation({
    // NOTE: payload must not include roleId (backend fills/assumes role)
    mutationFn: (payload: Omit<CreateUserDto, "roleId">) => createContractor(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users", "list"] });
    },
  });
}
