export type Role = "AUDITOR" | "STAFF";

export type EngagementStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "UNDER_REVIEW"
  | "COMPLETE"
  | "DELIVERED";

export type SubTaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
};

export type Client = {
  pan?: string | null;
  location?: string | null;
  fileLocation?: string | null;
  fiscalYearId: string;
  lineageId: string;
  id: string;
  name: string;
  createdAt: string;
};

export type SubTask = {
  dueDate?: string | null;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  id: string;
  engagementId: string;
  title: string;
  description: string | null;
  status: SubTaskStatus;
  progress: number;
  assignedToId: string;
  assignedTo: User;
  completedAt?: string | null;
  createdAt: string;
};

export type Comment = {
  id: string;
  engagementId: string;
  subTaskId: string | null;
  authorId: string;
  author: User;
  text: string;
  createdAt: string;
};

export type Engagement = {
  fiscalYearId: string;
  id: string;
  clientId: string;
  client: Client;
  natureOfWork: string;
  status: EngagementStatus;
  staffId: string;
  staff: User;
  startDate: string | null;
  targetDate: string | null;
  priority: string | null;
  subTasks: SubTask[];
  comments: Comment[];
  createdAt: string;
  progress: number;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
};

export type ActivityEntry = {
  id: string;
  engagementId: string;
  action: string;
  summary: string;
  createdAt: string;
  subTaskId?: string | null;
  actor: User;
  engagement?: {
    id: string;
    natureOfWork: string;
    client: { name: string };
  };
};

export type SubTaskDetail = SubTask & {
  engagement: {
    id: string;
    natureOfWork: string;
    status: EngagementStatus;
    staffId: string;
    client: { id: string; name: string };
  };
};

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  engagementId: string | null;
  subTaskId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationList = {
  items: AppNotification[];
  unreadCount: number;
};
