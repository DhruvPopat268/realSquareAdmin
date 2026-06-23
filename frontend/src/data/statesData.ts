export interface State {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const STATES: State[] = [
  { id: "s-1", name: "Maharashtra",      isActive: true,  createdAt: "2024-01-10T08:00:00Z", updatedAt: "2024-03-15T10:30:00Z" },
  { id: "s-2", name: "Delhi",            isActive: true,  createdAt: "2024-01-11T09:00:00Z", updatedAt: "2024-03-16T11:00:00Z" },
  { id: "s-3", name: "Karnataka",        isActive: true,  createdAt: "2024-01-12T10:00:00Z", updatedAt: "2024-03-17T09:45:00Z" },
  { id: "s-4", name: "Telangana",        isActive: true,  createdAt: "2024-01-13T08:30:00Z", updatedAt: "2024-04-01T14:00:00Z" },
  { id: "s-5", name: "Tamil Nadu",       isActive: true,  createdAt: "2024-01-14T11:00:00Z", updatedAt: "2024-04-05T16:20:00Z" },
  { id: "s-6", name: "West Bengal",      isActive: false, createdAt: "2024-02-01T08:00:00Z", updatedAt: "2024-05-05T09:00:00Z" },
  { id: "s-7", name: "Gujarat",          isActive: true,  createdAt: "2024-02-10T10:00:00Z", updatedAt: "2024-05-12T11:30:00Z" },
];
