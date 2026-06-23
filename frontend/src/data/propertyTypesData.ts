export interface PropertyType {
  id: string;
  name: string;
  category: string; // references PropertyCategory.name
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const PROPERTY_TYPES: PropertyType[] = [
  // Residential
  { id: "pt-1",  name: "Apartment",               category: "Residential", description: "A self-contained unit within a multi-storey residential building.",                   isActive: true,  createdAt: "2024-01-11T08:00:00Z", updatedAt: "2024-03-20T10:00:00Z" },
  { id: "pt-2",  name: "Independent House / Villa",category: "Residential", description: "A standalone residential property with independent entry and private outdoor space.",   isActive: true,  createdAt: "2024-01-13T09:00:00Z", updatedAt: "2024-04-05T11:30:00Z" },
  { id: "pt-3",  name: "Builder Floor",            category: "Residential", description: "An independently owned floor within a builder-constructed low-rise building.",         isActive: true,  createdAt: "2024-01-14T10:00:00Z", updatedAt: "2024-04-08T09:00:00Z" },
  { id: "pt-4",  name: "Studio Apartment",         category: "Residential", description: "A compact single-room apartment with combined living, sleeping, and kitchen areas.",    isActive: true,  createdAt: "2024-01-15T08:00:00Z", updatedAt: "2024-04-10T09:00:00Z" },
  { id: "pt-5",  name: "Penthouse",                category: "Residential", description: "A premium top-floor apartment with expansive views and luxury amenities.",             isActive: true,  createdAt: "2024-01-16T09:00:00Z", updatedAt: "2024-04-12T10:00:00Z" },
  // Commercial
  { id: "pt-6",  name: "Office Space",             category: "Commercial",  description: "Dedicated space for business operations, ranging from small cabins to large floors.",   isActive: true,  createdAt: "2024-01-18T08:30:00Z", updatedAt: "2024-04-15T14:00:00Z" },
  { id: "pt-7",  name: "Shop / Showroom",          category: "Commercial",  description: "Street-facing or mall-based retail unit for selling goods and services.",               isActive: true,  createdAt: "2024-01-20T11:00:00Z", updatedAt: "2024-05-01T16:00:00Z" },
  { id: "pt-8",  name: "Warehouse / Godown",       category: "Commercial",  description: "Large storage facility used for goods, inventory, and logistics operations.",          isActive: true,  createdAt: "2024-01-22T09:00:00Z", updatedAt: "2024-05-10T13:30:00Z" },
  { id: "pt-9",  name: "Industrial Building",      category: "Commercial",  description: "A building or site used for manufacturing, assembly, or industrial processes.",        isActive: false, createdAt: "2024-02-02T10:00:00Z", updatedAt: "2024-05-18T11:00:00Z" },
  { id: "pt-10", name: "Co-working Space",         category: "Commercial",  description: "Shared work environment for freelancers, startups, and remote teams.",                 isActive: true,  createdAt: "2024-02-05T08:00:00Z", updatedAt: "2024-05-20T09:00:00Z" },
  // Land / Plot
  { id: "pt-11", name: "Residential Plot",         category: "Land / Plot", description: "A land parcel approved for constructing a residential property.",                      isActive: true,  createdAt: "2024-02-10T12:00:00Z", updatedAt: "2024-06-05T15:00:00Z" },
  { id: "pt-12", name: "Commercial Plot",          category: "Land / Plot", description: "A land parcel zoned for commercial construction or business use.",                      isActive: true,  createdAt: "2024-02-15T09:00:00Z", updatedAt: "2024-06-10T11:00:00Z" },
  { id: "pt-13", name: "Agricultural Land",        category: "Land / Plot", description: "Open land used for farming, cultivation, and related agricultural activities.",         isActive: false, createdAt: "2024-02-20T09:30:00Z", updatedAt: "2024-06-14T12:00:00Z" },
  { id: "pt-14", name: "Industrial Plot",          category: "Land / Plot", description: "Land parcel in an industrial zone suitable for factory or warehouse construction.",     isActive: true,  createdAt: "2024-03-01T10:00:00Z", updatedAt: "2024-06-18T09:00:00Z" },
];
