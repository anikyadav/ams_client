import { useFiscalYear } from "@/components/providers/fiscal-year-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api as baseApi } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import type { Client, Comment, Engagement, SubTask, User } from "@/lib/types";

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
