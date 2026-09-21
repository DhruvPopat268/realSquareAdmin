import type { PropertyListing } from "@/services/propertyListingService";
import ResidentialDetails from "./ResidentialDetails";
import PlotDetails from "./PlotDetails";
import PGDetails from "./PGDetails";
import CommercialDetails from "./CommercialDetails";

interface Props {
  listing: PropertyListing;
}

/**
 * Determines which detail component to render based on the listing's category name.
 * Category names (case-insensitive):
 *   "Residential"  → ResidentialDetails
 *   "Plot" / "Land" → PlotDetails
 *   "PG" / "Co-living" → PGDetails
 *   "Commercial"   → CommercialDetails
 */
export default function PropertyTypeDetails({ listing }: Props) {
  const category = (listing.category?.name ?? "").toLowerCase();
  const listingType = (listing.listingType?.name ?? "").toLowerCase();

  // PG / Co-living — check listing type first since PG can have residential category
  if (listingType.includes("pg") || listingType.includes("co-living")) {
    if (!listing.pgDetails) return null;
    return (
      <PGDetails
        data={listing.pgDetails}
        rentInfo={listing.rentInfo}
      />
    );
  }

  // Residential
  if (category.includes("residential")) {
    if (!listing.residentialDetails) return null;
    return (
      <ResidentialDetails
        data={listing.residentialDetails}
        sellInfo={listing.sellInfo}
        rentInfo={listing.rentInfo}
      />
    );
  }

  // Plot / Land
  if (category.includes("plot") || category.includes("land") || category.includes("agricultural")) {
    if (!listing.plotDetails) return null;
    return (
      <PlotDetails
        data={listing.plotDetails}
        commercialDetails={listing.commercialDetails}
        sellInfo={listing.sellInfo}
      />
    );
  }

  // Commercial
  if (category.includes("commercial")) {
    if (!listing.commercialDetails) return null;
    return (
      <CommercialDetails
        data={listing.commercialDetails}
        sellInfo={listing.sellInfo}
        rentInfo={listing.rentInfo}
        propertyTypeName={listing.propertyType?.name}
      />
    );
  }

  // Fallback — unknown category, nothing to render
  return null;
}
