export type ListingStatus    = "Available" | "Sold" | "Rented" | "Under Offer";
export type FurnishingStatus = "Furnished" | "Semi-Furnished" | "Unfurnished";

export interface Property {
  id: number;
  refNo: string;
  title: string;
  address: string;
  city: string;
  purpose: string;    // references PropertyPurpose.name  (Sell | Rent | PG / Co-living)
  category: string;   // references PropertyCategory.name (Residential | Commercial | Land / Plot)
  type: string;       // references PropertyType.name filtered by category
  status: ListingStatus;
  price: number;
  previousPrice: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  plotSqft?: number;
  floor?: number;
  totalFloors?: number;
  parking?: number;
  furnishing?: FurnishingStatus;
  constructionYear?: number;
  occupancyType?: "Single" | "Double" | "Triple";
  mealsIncluded?: boolean;
  daysOnMarket: number;
  description: string;
  amenities: string[];
  agent: string;
  images: string[];
  createdAt: string;
}

export const PROPERTIES: Property[] = [
  {
    id: 1,
    refNo: "8048609",
    title: "3BHK Apartment, Lakewood Gardens",
    address: "9081 Lakewood Gardens Junction",
    city: "Los Angeles, CA",
    purpose: "Sell",
    category: "Residential",
    type: "Apartment",
    status: "Available",
    price: 9000000, previousPrice: 9500000,
    beds: 3, baths: 2, sqft: 1600,
    floor: 4, totalFloors: 12, parking: 2,
    furnishing: "Semi-Furnished", constructionYear: 2015,
    daysOnMarket: 22,
    description: "Spacious 3BHK apartment in a prime gated complex. Open kitchen with granite counters, large balcony with garden view, and two covered parking spots. Ready to move in.",
    amenities: ["Swimming Pool", "Gym", "24/7 Security", "Visitor Parking", "Power Backup"],
    agent: "Robert Fox",
    images: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=500&fit=crop",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=260&fit=crop",
    ],
    createdAt: "2024-09-03T08:00:00Z",
  },
  {
    id: 2,
    refNo: "7291034",
    title: "Independent Villa, Green Valley",
    address: "3890 Poplar Drive, Green Valley",
    city: "Denver, CO",
    purpose: "Sell",
    category: "Residential",
    type: "Independent House / Villa",
    status: "Under Offer",
    price: 6850000, previousPrice: 7200000,
    beds: 5, baths: 4, sqft: 3400, plotSqft: 5000,
    floor: 0, totalFloors: 2, parking: 3,
    furnishing: "Unfurnished", constructionYear: 2018,
    daysOnMarket: 8,
    description: "Luxury villa in the prestigious Green Valley neighbourhood. High ceilings, floor-to-ceiling windows, mountain views, and a private pool. Chef's kitchen with premium appliances.",
    amenities: ["Private Pool", "Landscaped Garden", "3-Car Garage", "Smart Home", "Solar Panels"],
    agent: "Kristin Watson",
    images: [
      "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&h=500&fit=crop",
      "https://images.unsplash.com/photo-1613977257592-4871e5fcd7c4?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1600210492493-0946911123ea?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=260&fit=crop",
    ],
    createdAt: "2024-08-24T10:00:00Z",
  },
  {
    id: 3,
    refNo: "5583921",
    title: "Commercial Plot, Maplewood",
    address: "3605 Parker Road, Maplewood",
    city: "Austin, TX",
    purpose: "Sell",
    category: "Land / Plot",
    type: "Commercial Plot",
    status: "Available",
    price: 4000000, previousPrice: 4100000,
    plotSqft: 8200,
    daysOnMarket: 35,
    description: "Corner commercial plot in Maplewood's fast-developing commercial corridor. Fully approved for mixed-use construction. Clear title with all approvals in place.",
    amenities: ["Corner Plot", "Road-Facing", "Clear Title", "Approved Layout"],
    agent: "Arlene McCoy",
    images: [
      "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&h=500&fit=crop",
      "https://images.unsplash.com/photo-1598228723793-52759bba239c?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=260&fit=crop",
    ],
    createdAt: "2024-07-21T08:00:00Z",
  },
  {
    id: 4,
    refNo: "3317640",
    title: "2BHK Apartment for Rent, Sunrise Hills",
    address: "7529 E. Pecan Street, Sunrise Hills",
    city: "Phoenix, AZ",
    purpose: "Rent",
    category: "Residential",
    type: "Apartment",
    status: "Available",
    price: 45000, previousPrice: 48000,
    beds: 2, baths: 2, sqft: 1100,
    floor: 5, totalFloors: 10, parking: 1,
    furnishing: "Furnished", constructionYear: 2019,
    daysOnMarket: 10,
    description: "Well-maintained 2BHK apartment with modern interiors. Fully furnished with quality appliances. Close to IT parks, malls, and metro. Ideal for working professionals.",
    amenities: ["Gym", "Swimming Pool", "Club House", "CCTV", "Intercom", "Power Backup"],
    agent: "Annette Black",
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=500&fit=crop",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=260&fit=crop",
    ],
    createdAt: "2024-09-08T09:00:00Z",
  },
  {
    id: 5,
    refNo: "9904512",
    title: "Office Space for Rent, Ridgeview",
    address: "775 Rolling Green Road, Ridgeview",
    city: "Seattle, WA",
    purpose: "Rent",
    category: "Commercial",
    type: "Office Space",
    status: "Available",
    price: 120000, previousPrice: 135000,
    sqft: 2700,
    floor: 8, totalFloors: 14, parking: 4,
    furnishing: "Furnished", constructionYear: 2015,
    daysOnMarket: 30,
    description: "Grade-A office suite on the 8th floor with panoramic city views. Open-plan layout with glass-partition meeting rooms, reception, server room, and two executive cabins.",
    amenities: ["Reception Area", "Meeting Rooms", "Server Room", "High-Speed Fiber", "Central AC", "Building Security"],
    agent: "Marvin McKinney",
    images: [
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=500&fit=crop",
      "https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1582063289852-62e3ba2747f8?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?w=400&h=260&fit=crop",
    ],
    createdAt: "2024-08-10T11:00:00Z",
  },
  {
    id: 6,
    refNo: "6620871",
    title: "Warehouse / Godown for Rent, Southside",
    address: "22 Industrial Estate Rd, Southside",
    city: "Houston, TX",
    purpose: "Rent",
    category: "Commercial",
    type: "Warehouse / Godown",
    status: "Available",
    price: 85000, previousPrice: 90000,
    sqft: 18000, parking: 15,
    constructionYear: 2010,
    daysOnMarket: 45,
    description: "Large-scale logistics warehouse with 10m clear height, 4 dock-level loading bays, and heavy-duty epoxy flooring. Secure compound with CCTV and gated entry. Excellent highway access.",
    amenities: ["4 Loading Bays", "10m Clear Height", "CCTV", "Gated Entry", "3-Phase Power", "Office Mezzanine"],
    agent: "Jerome Bell",
    images: [
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=500&fit=crop",
      "https://images.unsplash.com/photo-1553413077-190dd305871c?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=260&fit=crop",
    ],
    createdAt: "2024-07-15T09:00:00Z",
  },
  {
    id: 7,
    refNo: "2281447",
    title: "PG for Working Professionals, Lakeside",
    address: "112 Lakeside Avenue, Waterfront District",
    city: "Miami, FL",
    purpose: "PG / Co-living",
    category: "Residential",
    type: "Private Room",
    status: "Available",
    price: 12000, previousPrice: 13000,
    occupancyType: "Single", mealsIncluded: true,
    furnishing: "Furnished",
    daysOnMarket: 5,
    description: "Premium PG accommodation for working professionals. Private attached bathroom, daily housekeeping, and home-cooked meals included. High-speed Wi-Fi and 24/7 security.",
    amenities: ["Wi-Fi", "Meals Included", "Housekeeping", "AC", "Laundry", "24/7 Security", "CCTV"],
    agent: "Courtney Henry",
    images: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=500&fit=crop",
      "https://images.unsplash.com/photo-1560448075-bb485b067938?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=400&h=260&fit=crop",
    ],
    createdAt: "2024-09-01T08:00:00Z",
  },
  {
    id: 8,
    refNo: "4412093",
    title: "Co-living Flat, Marina Bay",
    address: "88 Harbour Front Walk, Marina Bay",
    city: "Miami, FL",
    purpose: "PG / Co-living",
    category: "Residential",
    type: "Entire Flat (Co-living)",
    status: "Available",
    price: 18000, previousPrice: 20000,
    beds: 3, baths: 2, sqft: 1200,
    floor: 6, totalFloors: 10, parking: 1,
    furnishing: "Furnished", mealsIncluded: false,
    constructionYear: 2021,
    daysOnMarket: 12,
    description: "Modern co-living flat managed by a professional operator. Three private bedrooms with shared living, kitchen, and bathrooms. All bills included. Rooftop terrace access.",
    amenities: ["Rooftop Terrace", "Smart TV", "High-Speed Wi-Fi", "Fully Equipped Kitchen", "Bills Included", "Cleaning Service"],
    agent: "Theresa Webb",
    images: [
      "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=800&h=500&fit=crop",
      "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1416331108676-a22ccb276e35?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&h=260&fit=crop",
    ],
    createdAt: "2024-08-20T10:00:00Z",
  },
];
