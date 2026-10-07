import { useFiscalYear } from "@/components/providers/fiscal-year-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api as baseApi } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import type {
  ActivityEntry,
  EngagementDocument,
  DocumentChallenge,
  Client,
  Comment,
  DocumentRequest,
  Engagement,
  Participant,
  NotificationList,
  SubTask,
  SubTaskDetail,
  User,
} from "@/lib/types";

function useFiscalApi() {
  const year = useFiscalYear();
  const config = { headers: { "X-Fiscal-Year-Id": year.id } };
  return {
    get: <T>(url: string) => baseApi.get<T>(url, config),
    post: <T>(url: string, data: unknown) => baseApi.post<T>(url, data, config),
    patch: <T>(url: string, data: unknown) =>
      baseApi.patch<T>(url, data, config),
    delete: (url: string) => baseApi.delete(url, config),
  };
}

export const queryKeys = {
  clients: ["clients"] as const,
  staff: ["staff"] as const,
  engagements: ["engagements"] as const,
  engagement: (id: string) => ["engagement", id] as const,
};

function invalidateEngagements(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["engagements"] });
  void queryClient.invalidateQueries({ queryKey: ["engagement"] });
  void queryClient.invalidateQueries({ queryKey: ["subtask"] });
  void queryClient.invalidateQueries({ queryKey: ["subtask-activity"] });
  void queryClient.invalidateQueries({ queryKey: ["engagement-activity"] });
  void queryClient.invalidateQueries({ queryKey: ["my-activity"] });
}

export function useDocument(id: string, clientProfile = false) {
  const api = useFiscalApi();
  const year = useFiscalYear();
  const queryClient = useQueryClient();
  const path = clientProfile ? `/clients/${id}/ird-credentials` : `/subtasks/${id}/document`;
  const details = useQuery({
    queryKey: ["document", path, year.id],
    queryFn: async () => (await api.get<EngagementDocument>(path)).data,
  });
  const save = async (payload: Record<string, unknown>) => {
    const data = (await api.patch<EngagementDocument>(path, payload)).data;
    queryClient.setQueryData(["document", path, year.id], data);
    void queryClient.invalidateQueries({ queryKey: ["document"] });
    invalidateEngagements(queryClient);
    return data;
  };
  // Secrets are deliberately never put into the query/mutation cache.
  return {
    details, save,
    challenge: async () => (await api.post<DocumentChallenge>(`${path}/challenge`, {})).data,
    reveal: async (token: string, answer: number) => {
      const result = (await api.post<{ password: string }>(`${path}/reveal`, { token, answer })).data;
      invalidateEngagements(queryClient);
      return result;
    },
  };
}

export function useIrdExport() {
  const api = useFiscalApi();
  const year = useFiscalYear();
  return {
    challenge: async () => (await api.post<DocumentChallenge>("/clients/ird-credentials/export/challenge", {})).data,
    download: async (token: string, answer: number) => (await baseApi.post<Blob>("/clients/ird-credentials/export", { token, answer }, {
      headers: { "X-Fiscal-Year-Id": year.id }, responseType: "blob",
    })).data,
  };
}

export const useClients = () => {
  const year = useFiscalYear();
  const api = useFiscalApi();
  const { user } = useAuth();
  return useQuery({
    queryKey: [...queryKeys.clients, year.id],
    queryFn: async () => (await api.get<Client[]>("/clients")).data,
    enabled: user?.role === "AUDITOR",
  });
};

export const useClient = (id: string) => {
  const year = useFiscalYear();
  const api = useFiscalApi();
  const { user } = useAuth();
  return useQuery({
    queryKey: [...queryKeys.clients, "detail", id, year.id],
    queryFn: async () => (await api.get<Client>(`/clients/${id}`)).data,
    enabled: user?.role === "AUDITOR" && Boolean(id),
  });
};

export const useStaff = () => {
  const api = useFiscalApi();
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.staff,
    queryFn: async () => (await api.get<User[]>("/users")).data,
    enabled: user?.role === "AUDITOR",
  });
};

export const useEngagements = (enabled = true) => {
  const api = useFiscalApi();
  const year = useFiscalYear();
  return useQuery({
    queryKey: [...queryKeys.engagements, year.id],
    refetchInterval: 10_000,
    enabled,
    queryFn: async () => (await api.get<Engagement[]>("/engagements")).data,
  });
};

export const useEngagement = (id: string | undefined) => {
  const api = useFiscalApi();
  const year = useFiscalYear();
  return useQuery({
    queryKey: [...queryKeys.engagement(id ?? ""), year.id],
    refetchInterval: 10_000,
    queryFn: async () => (await api.get<Engagement>(`/engagements/${id}`)).data,
    enabled: Boolean(id),
  });
};

export const useCreateClient = () => {
  const api = useFiscalApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; pan: string | null; location: string | null; fileLocation: string | null }) =>
      (await api.post<Client>("/clients", payload)).data,
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["clients"] }),
  });
};

export const useUpdateClient = () => {
  const api = useFiscalApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; name: string; pan: string | null; location: string | null; fileLocation: string | null }) =>
      (await api.patch<Client>(`/clients/${id}`, payload)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["clients"] });
      invalidateEngagements(queryClient);
    },
  });
};

export const useDeleteClient = () => {
  const api = useFiscalApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/clients/${id}`),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["clients"] }),
  });
};

export const useCreateStaff = () => {
  const api = useFiscalApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      email: string;
      password: string;
    }) => (await api.post<User>("/users", payload)).data,
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });
};

export const useUpdateStaff = () => {
  const api = useFiscalApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; name?: string; email?: string; password?: string }) =>
      (await api.patch<User>(`/users/${id}`, payload)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.staff });
      invalidateEngagements(queryClient);
    },
  });
};

export const useCreateEngagement = () => {
  const api = useFiscalApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      (await api.post<Engagement>("/engagements", payload)).data,
    onSuccess: () => invalidateEngagements(queryClient),
  });
};

export const useUpdateEngagement = () => {
  const api = useFiscalApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: Record<string, unknown>;
    }) => (await api.patch<Engagement>(`/engagements/${id}`, payload)).data,
    onSuccess: () => invalidateEngagements(queryClient),
  });
};

export const useDeleteEngagement = () => {
  const api = useFiscalApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/engagements/${id}`),
    onSuccess: () => invalidateEngagements(queryClient),
  });
};

export const useUpdateEngagementProgress = () => {
  const api = useFiscalApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; progress: number; comment?: string }) =>
      (await api.patch<Engagement>(`/engagements/${id}/progress`, payload)).data,
    onSuccess: () => invalidateEngagements(queryClient),
  });
};

export const useCreateSubTask = () => {
  const api = useFiscalApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      engagementId,
      payload,
    }: {
      engagementId: string;
      payload: Record<string, unknown>;
    }) =>
      (
        await api.post<SubTask>(
          `/engagements/${engagementId}/subtasks`,
          payload,
        )
      ).data,
    onSuccess: () => invalidateEngagements(queryClient),
  });
};

export const useReviewSubTask = () => {
  const api = useFiscalApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      decision,
      note,
    }: {
      id: string;
      decision: "APPROVE" | "REQUEST_CHANGES";
      note?: string;
    }) =>
      (await api.post<SubTask>(`/subtasks/${id}/review`, { decision, note }))
        .data,
    onSuccess: () => invalidateEngagements(queryClient),
  });
};

export const useAddChecklistItem = () => {
  const api = useFiscalApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, text }: { taskId: string; text: string }) =>
      (await api.post<SubTask>(`/subtasks/${taskId}/checklist`, { text })).data,
    onSuccess: () => invalidateEngagements(queryClient),
  });
};

export const useUpdateChecklistItem = () => {
  const api = useFiscalApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: { done?: boolean; text?: string };
    }) => (await api.patch<SubTask>(`/checklist-items/${id}`, payload)).data,
    onSuccess: () => invalidateEngagements(queryClient),
  });
};

export const useRemoveChecklistItem = () => {
  const api = useFiscalApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/checklist-items/${id}`),
    onSuccess: () => invalidateEngagements(queryClient),
  });
};

export const useCreateDocumentRequest = () => {
  const api = useFiscalApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      engagementId,
      payload,
    }: {
      engagementId: string;
      payload: { title: string; dueDate?: string | null };
    }) =>
      (
        await api.post<DocumentRequest>(
          `/engagements/${engagementId}/requests`,
          payload,
        )
      ).data,
    onSuccess: () => invalidateEngagements(queryClient),
  });
};

export const useUpdateDocumentRequest = () => {
  const api = useFiscalApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: Record<string, unknown>;
    }) =>
      (await api.patch<DocumentRequest>(`/document-requests/${id}`, payload))
        .data,
    onSuccess: () => invalidateEngagements(queryClient),
  });
};

export const useDeleteDocumentRequest = () => {
  const api = useFiscalApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/document-requests/${id}`),
    onSuccess: () => invalidateEngagements(queryClient),
  });
};

export const useParticipants = (engagementId: string) => {
  const api = useFiscalApi();
  const year = useFiscalYear();
  return useQuery({
    queryKey: ["participants", engagementId, year.id],
    staleTime: 60_000,
    queryFn: async () =>
      (await api.get<Participant[]>(`/engagements/${engagementId}/participants`))
        .data,
  });
};

export type CloneResult = {
  created: { id: string; clientName: string; natureOfWork: string }[];
  skipped: { sourceId: string; label: string; reason: string }[];
};

export const useCloneEngagements = () => {
  const api = useFiscalApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sourceIds: string[]) =>
      (await api.post<CloneResult>("/engagements/clone", { sourceIds })).data,
    onSuccess: () => invalidateEngagements(queryClient),
  });
};

/** Engagements of another fiscal year (auditors), used as the source when copying. */
export const useEngagementsOfYear = (yearId: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["engagements-of-year", yearId],
    enabled: !!yearId && user?.role === "AUDITOR",
    queryFn: async () =>
      (
        await baseApi.get<Engagement[]>("/engagements", {
          headers: { "X-Fiscal-Year-Id": yearId },
        })
      ).data,
  });
};

export const useUpdateSubTask = () => {
  const api = useFiscalApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: Record<string, unknown>;
    }) => (await api.patch<SubTask>(`/subtasks/${id}`, payload)).data,
    onSuccess: () => invalidateEngagements(queryClient),
  });
};

export const useDeleteSubTask = () => {
  const api = useFiscalApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/subtasks/${id}`),
    onSuccess: () => invalidateEngagements(queryClient),
  });
};

export const useCreateEngagementComment = () => {
  const api = useFiscalApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      engagementId,
      text,
    }: {
      engagementId: string;
      text: string;
    }) =>
      (
        await api.post<Comment>(`/engagements/${engagementId}/comments`, {
          text,
        })
      ).data,
    onSuccess: () => invalidateEngagements(queryClient),
  });
};

export const useCreateSubTaskComment = () => {
  const api = useFiscalApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      subTaskId,
      text,
    }: {
      subTaskId: string;
      text: string;
    }) =>
      (await api.post<Comment>(`/subtasks/${subTaskId}/comments`, { text }))
        .data,
    onSuccess: () => invalidateEngagements(queryClient),
  });
};

export const useUpdateComment = () => {
  const api = useFiscalApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) =>
      (await api.patch<Comment>(`/comments/${id}`, { text })).data,
    onSuccess: () => invalidateEngagements(queryClient),
  });
};

export const useDeleteComment = () => {
  const api = useFiscalApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/comments/${id}`),
    onSuccess: () => invalidateEngagements(queryClient),
  });
};

export const useEngagementActivity = (id: string, enabled: boolean) => {
  const api = useFiscalApi();
  const year = useFiscalYear();
  return useQuery({
    queryKey: ["engagement-activity", id, year.id],
    enabled,
    staleTime: 0,
    queryFn: async () =>
      (await api.get<ActivityEntry[]>(`/engagements/${id}/activity`)).data,
  });
};

export const useChangePassword = () =>
  useMutation({
    mutationFn: async (payload: { currentPassword: string; newPassword: string }) =>
      baseApi.post("/auth/change-password", payload),
  });

export const useSubTask = (id: string) => {
  const api = useFiscalApi();
  const year = useFiscalYear();
  return useQuery({
    queryKey: ["subtask", id, year.id],
    refetchInterval: 15_000,
    enabled: Boolean(id),
    queryFn: async () => (await api.get<SubTaskDetail>(`/subtasks/${id}`)).data,
  });
};

export const useSubTaskActivity = (id: string) => {
  const api = useFiscalApi();
  const year = useFiscalYear();
  return useQuery({
    queryKey: ["subtask-activity", id, year.id],
    enabled: Boolean(id),
    queryFn: async () =>
      (await api.get<ActivityEntry[]>(`/subtasks/${id}/activity`)).data,
  });
};

export const useMyActivity = (enabled = true) => {
  const api = useFiscalApi();
  const year = useFiscalYear();
  return useQuery({
    queryKey: ["my-activity", year.id],
    enabled,
    queryFn: async () => (await api.get<ActivityEntry[]>("/activity/mine")).data,
  });
};

export const useNotifications = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notifications"],
    enabled: Boolean(user),
    refetchInterval: 30_000,
    staleTime: 10_000,
    queryFn: async () => (await baseApi.get<NotificationList>("/notifications")).data,
  });
};

export const useMarkNotificationsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id?: string) =>
      id
        ? baseApi.post(`/notifications/${id}/read`)
        : baseApi.post("/notifications/read-all"),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
};
