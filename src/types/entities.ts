export type Tone = "brand" | "neutral" | "success" | "warning" | "danger";

export type Priority = "low" | "medium" | "high" | "urgent";
export type WorkOrderStatus =
  | "open"
  | "in_progress"
  | "scheduled"
  | "blocked"
  | "completed";
export type AssetHealth = "healthy" | "warning" | "critical" | "offline";
export type ProviderStatus = "active" | "pending" | "inactive";
export type MessageChannel = "internal" | "provider";
export type NotificationSeverity = "info" | "success" | "warning" | "critical";
export type KPITrend = "up" | "down" | "neutral";
export type ModuleReadiness = "ready" | "foundation" | "planned";
export type AssetCriticality = "low" | "medium" | "high";
export type AssetMediaKind = "image" | "video" | "document";

export interface User {
  id: string;
  fullName: string;
  role: string;
  email: string;
  initials: string;
  team: string;
  availability: "online" | "away" | "offline";
  companyId: string;
}

export interface Company {
  id: string;
  name: string;
  industry: string;
  headquarters: string;
  locations: number;
  activeAssets: number;
  openWorkOrders: number;
  complianceScore: number;
}

export interface Asset {
  id: string;
  name: string;
  code: string;
  category: string;
  site: string;
  status: AssetHealth;
  criticality: AssetCriticality;
  nextServiceAt: string;
  nextServiceLabel: string;
  lastInterventionAt: string;
  lastInterventionLabel: string;
  openIssues: number;
  utilization: number;
}

export interface WorkOrder {
  id: string;
  title: string;
  assetId: string;
  assetName: string;
  trade?: string;
  site: string;
  assignee: string;
  resolution: "internal" | "external";
  priority: Priority;
  status: WorkOrderStatus;
  requestedAt: string;
  dueAt: string;
  dueLabel: string;
  estimatedHours: number;
  evidenceCount: number;
  followsWorkOrderId?: string;
}

export interface Provider {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  responseTimeHours: number;
  activeOrders: number;
  status: ProviderStatus;
}

export interface Message {
  id: string;
  counterpart: string;
  channel: MessageChannel;
  subject: string;
  snippet: string;
  unread: boolean;
  updatedAtLabel: string;
  relatedWorkOrderId?: string;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  severity: NotificationSeverity;
  createdAtLabel: string;
  read: boolean;
}

export interface KPI {
  id: string;
  label: string;
  value: string;
  helperText: string;
  trend: KPITrend;
  delta: string;
  tone: Exclude<Tone, "neutral">;
  icon: "clipboard" | "alert" | "shield" | "boxes";
}

export interface Alert {
  id: string;
  assetId: string;
  title: string;
  description: string;
  severity: "info" | "warning" | "critical";
  dueLabel: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  occurredAtLabel: string;
  kind: "evidence" | "assignment" | "provider" | "schedule" | "alert";
  tone: Exclude<Tone, "neutral">;
}

export interface ModulePreview {
  id: string;
  title: string;
  href: string;
  description: string;
  readiness: ModuleReadiness;
  metricLabel: string;
  metricValue: string;
}

export interface OverviewMetric {
  label: string;
  value: string;
  tone?: Tone;
}

export interface DashboardData {
  company: Company;
  currentUser: User;
  kpis: KPI[];
  workOrders: WorkOrder[];
  assets: Asset[];
  alerts: Alert[];
  activity: ActivityItem[];
  modules: ModulePreview[];
  providers: Provider[];
  messages: Message[];
  notifications: Notification[];
}

export interface WorkOrderDraft {
  title: string;
  type: string;
  priority: Priority;
  status: WorkOrderStatus;
  site: string;
  assignee: string;
  resolution: "internal" | "external";
  dueAt: string;
  estimatedHours: string;
  assetIds: string[];
  followsWorkOrderId: string;
  description: string;
  checklist: string[];
  observations: string;
  attachments: File[];
}

export interface AssetMotorDraft {
  id: string;
  name: string;
  powerKw: string;
  voltage: string;
  current: string;
  consumption: string;
}

export interface AssetSpecDraft {
  id: string;
  label: string;
  value: string;
}

export interface AssetDraft {
  name: string;
  code: string;
  category: string;
  site: string;
  criticality: AssetCriticality;
  brand: string;
  model: string;
  serialNumber: string;
  purchaseDate: string;
  purchaseProvider: string;
  purchaseLocation: string;
  cost: string;
  installedBy: string;
  installationDate: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  maintenanceFrequency: string;
  warrantyUntil: string;
  notes: string;
  motors: AssetMotorDraft[];
  specs: AssetSpecDraft[];
  media: File[];
}

export interface PartItem {
  id: string;
  name: string;
  code: string;
  category: string;
  stock: number;
  minStock: number;
  unit: string;
  supplier: string;
  location: string;
  compatibleAssetIds: string[];
  cost: number;
  criticality: AssetCriticality;
}
