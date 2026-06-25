import { useNavigate } from "react-router-dom";
import UserManagementPage, { type RoleUser } from "@/components/UserManagementPage";

const INITIAL_OWNERS: RoleUser[] = [
  { id: 1, name: "Suresh Kapoor",   email: "suresh@example.com",  mobile: "+91 98100 21001", city: "Mumbai",    gstNumber: "27AAACS1234A1Z5", isActive: true,  createdAt: "5 Jan, 2024",  totalPropertiesListed: 8,  activePropertiesListed: 5 },
  { id: 2, name: "Lalitha Rao",     email: "lalitha@example.com", mobile: "+91 98100 21002", city: "Hyderabad", gstNumber: "36AAACL5678B1Z1", isActive: true,  createdAt: "8 Jan, 2024",  totalPropertiesListed: 4,  activePropertiesListed: 3 },
  { id: 3, name: "Dinesh Malhotra", email: "dinesh@example.com",  mobile: "+91 98100 21003", city: "Delhi",     gstNumber: "07AAACD9012C1Z7", isActive: false, createdAt: "12 Jan, 2024", totalPropertiesListed: 2,  activePropertiesListed: 0 },
  { id: 4, name: "Kavita Shah",     email: "kavita@example.com",  mobile: "+91 98100 21004", city: "Ahmedabad",                               isActive: true,  createdAt: "15 Jan, 2024", totalPropertiesListed: 6,  activePropertiesListed: 6 },
  { id: 5, name: "Ramesh Iyer",     email: "ramesh@example.com",  mobile: "+91 98100 21005", city: "Chennai",   gstNumber: "33AAAER3456D1Z3", isActive: true,  createdAt: "18 Jan, 2024", totalPropertiesListed: 11, activePropertiesListed: 7 },
];

export default function OwnersPage() {
  const navigate = useNavigate();
  return (
    <UserManagementPage
      title="Owners"
      showGst={true}
      showPropertyStats={true}
      initialData={INITIAL_OWNERS}
      onViewProperties={(u) => navigate("/properties", { state: { listedByType: "Owner", listedByName: u.name } })}
    />
  );
}
