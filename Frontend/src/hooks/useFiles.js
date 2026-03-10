import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { filesApi } from '../services/axios';

export function useFiles(folderId = null, trashed = false) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['files', folderId, trashed],
    queryFn: () => filesApi.list(folderId, trashed),
  });
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['files'] });
  };
  return { ...query, files: query.data?.files ?? [], invalidate };
}

export function useFile(id) {
  return useQuery({
    queryKey: ['file', id],
    queryFn: () => filesApi.get(id),
    enabled: !!id,
  });
}

export function useRenameFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, original_name }) => filesApi.rename(id, original_name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['files'] }),
  });
}

export function useTrashFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => filesApi.trash(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['files'] }),
  });
}
