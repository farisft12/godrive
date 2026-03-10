import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { filesApi } from '../services/axios';

export function useUpload(folderId = null) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});
  const queryClient = useQueryClient();

  const upload = useCallback(
    async (files) => {
      if (!files?.length) return;
      setUploading(true);
      const prog = {};
      files.forEach((_, i) => (prog[i] = 0));
      setProgress(prog);

      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('file', files[i]);
        if (folderId) formData.append('folder_id', folderId);
        try {
          await filesApi.upload(formData, (e) => {
            const p = e.loaded && e.total ? Math.round((e.loaded / e.total) * 100) : 0;
            setProgress((prev) => ({ ...prev, [i]: p }));
          });
        } catch (err) {
          throw err;
        }
      }

      setUploading(false);
      setProgress({});
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
    [folderId, queryClient]
  );

  return { upload, uploading, progress };
}
