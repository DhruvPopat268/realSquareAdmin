/**
 * Returns available status transitions for a listing based on its current
 * status and listing type ID (compared against VITE_ env vars).
 *
 * Admin rules (Approve / Reject stay outside this utility — Actions column):
 *   Active      → Inactive, Sold (Sell only), Rented (Rent/PG only)
 *   Inactive    → Active
 *   Sold        → Active
 *   Rented      → Active
 *   Rejected    → Active
 *   UnderReview → (none — use Approve / Reject)
 */

export interface StatusOption {
  value: string;
  label: string;
  apiAction: "markInactive" | "markActive" | "markSold" | "markRented";
  confirmTitle: string;
  confirmMessage: string;
  color: "gray" | "blue" | "teal" | "green";
}

export function getAvailableStatusOptions(
  currentStatus: string,
  listingTypeId?: string | null
): StatusOption[] {
  const SELL_ID = import.meta.env.VITE_LISTING_TYPE_SELL_ID;
  const RENT_ID = import.meta.env.VITE_LISTING_TYPE_RENT_ID;
  const PG_ID = import.meta.env.VITE_LISTING_TYPE_PG_ID;

  const isSell = listingTypeId === SELL_ID;
  const isRentOrPG = listingTypeId === RENT_ID || listingTypeId === PG_ID;

  switch (currentStatus) {
    case "Active": {
      const opts: StatusOption[] = [
        {
          value: "Inactive",
          label: "Mark as Inactive",
          apiAction: "markInactive",
          confirmTitle: "Mark Listing Inactive?",
          confirmMessage:
            "This listing will be hidden from search results. It can be reactivated later.",
          color: "gray",
        },
      ];
      if (isSell) {
        opts.push({
          value: "Sold",
          label: "Mark as Sold",
          apiAction: "markSold",
          confirmTitle: "Mark Listing as Sold?",
          confirmMessage:
            "This will mark the property as sold. It will no longer appear in active searches.",
          color: "blue",
        });
      }
      if (isRentOrPG) {
        opts.push({
          value: "Rented",
          label: "Mark as Rented",
          apiAction: "markRented",
          confirmTitle: "Mark Listing as Rented?",
          confirmMessage:
            "This will mark the property as rented. It will no longer appear in active searches.",
          color: "teal",
        });
      }
      return opts;
    }

    case "Inactive":
    case "Sold":
    case "Rented":
    case "Rejected":
      return [
        {
          value: "Active",
          label: "Mark as Active",
          apiAction: "markActive",
          confirmTitle: "Reactivate Listing?",
          confirmMessage: "This listing will become visible in search results again.",
          color: "green",
        },
      ];

    case "UnderReview":
    default:
      return [];
  }
}

export const OPTION_COLOR_CONFIG: Record<
  StatusOption["color"],
  { btn: string; confirmBtn: string }
> = {
  gray: {
    btn: "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200",
    confirmBtn: "bg-gray-600 hover:bg-gray-700 text-white",
  },
  blue: {
    btn: "bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200",
    confirmBtn: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  teal: {
    btn: "bg-teal-50 text-teal-600 hover:bg-teal-100 border border-teal-200",
    confirmBtn: "bg-teal-600 hover:bg-teal-700 text-white",
  },
  green: {
    btn: "bg-green-50 text-green-600 hover:bg-green-100 border border-green-200",
    confirmBtn: "bg-green-600 hover:bg-green-700 text-white",
  },
};
