export interface City {
  id: string;
  name: string;
  state: string; // references State.name
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const CITIES: City[] = [
  { id: "c-1", name: "Mumbai",    state: "Maharashtra", isActive: true,  createdAt: "2024-01-10T08:00:00Z", updatedAt: "2024-03-15T10:30:00Z" },
  { id: "c-2", name: "Pune",      state: "Maharashtra", isActive: true,  createdAt: "2024-01-15T09:15:00Z", updatedAt: "2024-04-10T13:00:00Z" },
  { id: "c-3", name: "New Delhi", state: "Delhi",       isActive: true,  createdAt: "2024-01-11T09:00:00Z", updatedAt: "2024-03-16T11:00:00Z" },
  { id: "c-4", name: "Bangalore", state: "Karnataka",   isActive: true,  createdAt: "2024-01-12T10:00:00Z", updatedAt: "2024-03-17T09:45:00Z" },
  { id: "c-5", name: "Hyderabad", state: "Telangana",   isActive: true,  createdAt: "2024-01-13T08:30:00Z", updatedAt: "2024-04-01T14:00:00Z" },
  { id: "c-6", name: "Chennai",   state: "Tamil Nadu",  isActive: true,  createdAt: "2024-01-14T11:00:00Z", updatedAt: "2024-04-05T16:20:00Z" },
  { id: "c-7", name: "Kolkata",   state: "West Bengal", isActive: false, createdAt: "2024-02-01T08:00:00Z", updatedAt: "2024-05-05T09:00:00Z" },
  { id: "c-8", name: "Ahmedabad", state: "Gujarat",     isActive: true,  createdAt: "2024-02-10T10:00:00Z", updatedAt: "2024-05-12T11:30:00Z" },
  { id: "c-9", name: "Surat",     state: "Gujarat",     isActive: true,  createdAt: "2024-02-15T10:00:00Z", updatedAt: "2024-05-15T11:00:00Z" },
];
