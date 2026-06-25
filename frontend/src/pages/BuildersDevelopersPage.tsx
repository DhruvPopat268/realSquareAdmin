import { useNavigate } from "react-router-dom";
import UserManagementPage, { type RoleUser } from "@/components/UserManagementPage";

const INITIAL_BUILDERS: RoleUser[] = [
  { id: 1, name: "Arjun Nair",     email: "arjun@example.com",   mobile: "+91 98001 11003", city: "Bangalore", gstNumber: "29AABCU9603R1ZX", isActive: true,  createdAt: "15 Jan, 2024" },
  { id: 2, name: "Karan Joshi",    email: "karan@example.com",   mobile: "+91 98001 11007", city: "Hyderabad", gstNumber: "36AABCU9603R1ZZ", isActive: true,  createdAt: "25 Jan, 2024" },
  { id: 3, name: "Sunita Reddy",   email: "sunita@example.com",  mobile: "+91 98100 41001", city: "Chennai",   gstNumber: "33AABCS1234A1Z1", isActive: true,  createdAt: "2 Feb, 2024"  },
  { id: 4, name: "Harish Patel",   email: "harish@example.com",  mobile: "+91 98100 41002", city: "Ahmedabad", gstNumber: "24AABCH5678B1Z4", isActive: false, createdAt: "5 Feb, 2024"  },
  { id: 5, name: "Meera Bansal",   email: "meera@example.com",   mobile: "+91 98100 41003", city: "Delhi",     gstNumber: "07AABCM9012C1Z6", isActive: true,  createdAt: "8 Feb, 2024"  },
];

export default function BuildersDevelopersPage() {
  const navigate = useNavigate();
  return (
    <UserManagementPage
      title="Builders / Developers"
      showGst={true}
      initialData={INITIAL_BUILDERS}
      onViewProperties={(u) => navigate("/properties", { state: { listedByType: "Builder / Developer", listedByName: u.name } })}
      onViewProjects={(u) => navigate("/projects", { state: { listedByType: "Builder / Developer", listedByName: u.name } })}
    />
  );
}
