export type PropertyStatus = "Available" | "Sold" | "Rented" | "Under Offer";
export type PropertyType = "Single Family Residence" | "Apartment" | "Townhouse" | "Villa" | "Condominium" | "Multi Family";
export type ListingType = "For Sale" | "For Rent";

export interface Property {
  id: number;
  refNo: string;
  title: string;
  address: string;
  city: string;
  beds: number;
  baths: number;
  sqft: number;
  lotSize: string;
  price: number;
  previousPrice: number;
  pricePerSqft: number;
  listingType: ListingType;
  propertyType: PropertyType;
  status: PropertyStatus;
  daysOnMarket: number;
  constructionYear: number;
  constructionMaterial: string;
  description: string;
  flooring: string[];
  features: string[];
  agent: string;
  images: string[];
  createdAt: string;
}

export const PROPERTIES: Property[] = [
  {
    id: 1,
    refNo: "8048609",
    title: "1639 Tomb Ave",
    address: "9081 Lakewood Gardens Junction",
    city: "Los Angeles, CA",
    beds: 4, baths: 3, sqft: 1600, lotSize: "8000 sqft",
    price: 9000000, previousPrice: 9500000, pricePerSqft: 1150,
    listingType: "For Sale", propertyType: "Single Family Residence",
    status: "Available", daysOnMarket: 22,
    constructionYear: 1947, constructionMaterial: "Masonite",
    description: "A brand new home ready for occupation. This wonderful property is located in a prime location. The charming exterior and covered porch are so inviting along with a large backyard to enjoy with a deck. Once you enter, you will fall in love with the openness and beauty of the home. Tall vaulted ceiling is in the family room which leads into an open kitchen and dining area. The kitchen is expertly designed with a huge island and granite counters. Large bedrooms with wooden floors. Large utility room with ample storage and natural light. This property invites you in from the moment it comes into view!",
    flooring: ["Carpet", "Ceramic Tile", "Concrete"],
    features: ["Factory Built", "Carbon Monoxide Detector(s)", "Fire Alarm", "Panic Alarm", "Security System"],
    agent: "Robert Fox",
    images: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=500&fit=crop",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=260&fit=crop",
    ],
    createdAt: "3 Sep, 2023",
  },
  {
    id: 2,
    refNo: "7291034",
    title: "7529 E. Pecan St.",
    address: "7529 E. Pecan Street, Sunrise Hills",
    city: "Phoenix, AZ",
    beds: 3, baths: 2, sqft: 2100, lotSize: "6500 sqft",
    price: 5400000, previousPrice: 5800000, pricePerSqft: 980,
    listingType: "For Rent", propertyType: "Condominium",
    status: "Available", daysOnMarket: 15,
    constructionYear: 2005, constructionMaterial: "Brick",
    description: "A stunning condominium in the heart of the city. Modern finishes throughout with an open floor plan. Gourmet kitchen with stainless steel appliances. Master suite with walk-in closet and spa-like bathroom. Two additional bedrooms perfect for family or guests.",
    flooring: ["Hardwood", "Ceramic Tile"],
    features: ["Central Air", "Granite Countertops", "Walk-in Closet", "Balcony", "Parking"],
    agent: "Annette Black",
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=500&fit=crop",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=260&fit=crop",
    ],
    createdAt: "8 Sep, 2023",
  },
  {
    id: 3,
    refNo: "5583921",
    title: "3890 Poplar Dr.",
    address: "3890 Poplar Drive, Green Valley",
    city: "Denver, CO",
    beds: 5, baths: 4, sqft: 3400, lotSize: "12000 sqft",
    price: 6850000, previousPrice: 7200000, pricePerSqft: 1380,
    listingType: "For Sale", propertyType: "Villa",
    status: "Under Offer", daysOnMarket: 8,
    constructionYear: 2018, constructionMaterial: "Stucco",
    description: "Luxury villa nestled in the prestigious Green Valley neighborhood. This stunning property boasts high ceilings, floor-to-ceiling windows, and a breathtaking mountain view. Expansive outdoor living area with pool and spa. Chef's kitchen with top-of-the-line appliances.",
    flooring: ["Marble", "Hardwood"],
    features: ["Swimming Pool", "Spa", "3-Car Garage", "Smart Home", "Solar Panels", "Fire Alarm"],
    agent: "Kristin Watson",
    images: [
      "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&h=500&fit=crop",
      "https://images.unsplash.com/photo-1613977257592-4871e5fcd7c4?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1600210492493-0946911123ea?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=260&fit=crop",
    ],
    createdAt: "24 Aug, 2023",
  },
  {
    id: 4,
    refNo: "3317640",
    title: "3605 Parker Rd.",
    address: "3605 Parker Road, Maplewood",
    city: "Austin, TX",
    beds: 3, baths: 2, sqft: 1850, lotSize: "5500 sqft",
    price: 4000000, previousPrice: 4100000, pricePerSqft: 890,
    listingType: "For Sale", propertyType: "Townhouse",
    status: "Sold", daysOnMarket: 5,
    constructionYear: 2012, constructionMaterial: "Wood Frame",
    description: "Charming townhouse in the sought-after Maplewood community. Recently renovated kitchen and bathrooms. Private patio and attached garage. Walking distance to shops and restaurants. HOA includes pool and fitness center.",
    flooring: ["Laminate", "Carpet"],
    features: ["HOA Pool", "Fitness Center", "Attached Garage", "Patio", "Security System"],
    agent: "Arlene McCoy",
    images: [
      "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&h=500&fit=crop",
      "https://images.unsplash.com/photo-1598228723793-52759bba239c?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=260&fit=crop",
    ],
    createdAt: "21 Aug, 2023",
  },
  {
    id: 5,
    refNo: "9904512",
    title: "775 Rolling Green Rd.",
    address: "775 Rolling Green Road, Ridgeview",
    city: "Seattle, WA",
    beds: 4, baths: 3, sqft: 2700, lotSize: "9000 sqft",
    price: 3725000, previousPrice: 3900000, pricePerSqft: 820,
    listingType: "For Sale", propertyType: "Single Family Residence",
    status: "Available", daysOnMarket: 30,
    constructionYear: 2000, constructionMaterial: "Cedar Wood",
    description: "Beautifully maintained single-family home on a quiet street in Ridgeview. Vaulted ceilings in the living room, updated kitchen with granite countertops, and a large deck overlooking the private backyard. Master suite with dual vanities and soaking tub.",
    flooring: ["Hardwood", "Carpet", "Ceramic Tile"],
    features: ["Deck", "Central AC", "Dual Vanities", "Soaking Tub", "Carbon Monoxide Detector(s)", "Security System"],
    agent: "Marvin McKinney",
    images: [
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=500&fit=crop",
      "https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1582063289852-62e3ba2747f8?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?w=400&h=260&fit=crop",
    ],
    createdAt: "10 Aug, 2023",
  },
  {
    id: 6,
    refNo: "6620871",
    title: "112 Lakeside Ave.",
    address: "112 Lakeside Avenue, Waterfront District",
    city: "Miami, FL",
    beds: 2, baths: 2, sqft: 1200, lotSize: "3200 sqft",
    price: 2100000, previousPrice: 2200000, pricePerSqft: 720,
    listingType: "For Rent", propertyType: "Apartment",
    status: "Available", daysOnMarket: 12,
    constructionYear: 2020, constructionMaterial: "Concrete",
    description: "Modern luxury apartment with stunning lake views. Floor-to-ceiling windows flood the space with natural light. Open concept living and dining. Resort-style amenities including rooftop pool and concierge service.",
    flooring: ["Porcelain Tile", "Hardwood"],
    features: ["Rooftop Pool", "Concierge", "Lake View", "Fitness Center", "Valet Parking", "Fire Alarm"],
    agent: "Courtney Henry",
    images: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=500&fit=crop",
      "https://images.unsplash.com/photo-1560448075-bb485b067938?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=400&h=260&fit=crop",
      "https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=400&h=260&fit=crop",
    ],
    createdAt: "5 Aug, 2023",
  },
];
