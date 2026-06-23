export interface PropertyPurpose {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const PROPERTY_PURPOSES: PropertyPurpose[] = [
  {
    id: "pp-1",
    name: "Sell",
    description: "Properties listed for outright sale or ownership transfer.",
    isActive: true,
    createdAt: "2024-01-10T08:00:00Z",
    updatedAt: "2024-03-15T10:30:00Z",
  },
  {
    id: "pp-2",
    name: "Rent",
    description: "Properties available for short or long-term rental by tenants.",
    isActive: true,
    createdAt: "2024-01-12T09:00:00Z",
    updatedAt: "2024-04-01T11:00:00Z",
  },
  {
    id: "pp-3",
    name: "PG / Co-living",
    description: "Paying guest accommodations and co-living spaces with shared amenities.",
    isActive: true,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-04-10T09:45:00Z",
  },
];
