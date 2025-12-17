// src/hooks/useDmContacts.ts
import { useQuery } from '@tanstack/react-query';
import { listDmContacts, type Peer } from '../../services/chat/contacts.api';

export function useDmContacts(search = "", limit = 30) {
  return useQuery<Peer[]>({
    queryKey: ["dm-contacts", search, limit],
    queryFn: () => listDmContacts({ search, limit }),
    staleTime: 60_000,
  });
}
