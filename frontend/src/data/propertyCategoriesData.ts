export interface PropertyCategory {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const PROPERTY_CATEGORIES: PropertyCategory[] = [
  {
    id: "pc-1",
    name: "Residential",
    description: "Properties intended for people to live in, such as apartments, houses, and villas.",
    isActive: true,
    createdAt: "2024-01-10T08:00:00Z",
    updatedAt: "2024-03-15T10:30:00Z",
  },
  {
    id: "pc-2",
    name: "Commercial",
    description: "Properties used for business purposes such as offices, shops, and warehouses.",
    isActive: true,
    createdAt: "2024-01-12T09:00:00Z",
    updatedAt: "2024-04-01T11:00:00Z",
  },
  {
    id: "pc-3",
    name: "Land / Plot",
    description: "Vacant land parcels available for construction, farming, or investment.",
    isActive: true,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-04-10T09:45:00Z",
  },
];
