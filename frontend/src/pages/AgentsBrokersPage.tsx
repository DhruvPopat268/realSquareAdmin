import { useNavigate } from "react-router-dom";
import UserManagementPage, { type RoleUser } from "@/components/UserManagementPage";

const INITIAL_AGENTS: RoleUser[] = [
  { id: 1, name: "Priya Mehta",   email: "priya@example.com",   mobile: "+91 98001 11002", city: "Pune",      gstNumber: "27AABCU9603R1ZV", isActive: true,  createdAt: "12 Jan, 2024" },
  { id: 2, name: "Vikram Singh",  email: "vikram@example.com",  mobile: "+91 98001 11005", city: "Delhi",     gstNumber: "07AABCU9603R1ZY", isActive: false, createdAt: "20 Jan, 2024" },
  { id: 3, name: "Pooja Verma",   email: "pooja@example.com",   mobile: "+91 98100 31001", city: "Bangalore", gstNumber: "29AABCP1234A1Z2", isActive: true,  createdAt: "22 Jan, 2024" },
  { id: 4, name: "Ajay Tiwari",   email: "ajay@example.com",    mobile: "+91 98100 31002", city: "Kolkata",                                isActive: true,  createdAt: "25 Jan, 2024" },
  { id: 5, name: "Nisha Gupta",   email: "nisha@example.com",   mobile: "+91 98100 31003", city: "Mumbai",    gstNumber: "27AABCN5678B1Z3", isActive: true,  createdAt: "28 Jan, 2024" },
];

export default function AgentsBrokersPage() {
  const navigate = useNavigate();
  return (
    <UserManagementPage
      title="Agents / Brokers"
      showGst={true}
      initialData={INITIAL_AGENTS}
      onViewProperties={(u) => navigate("/properties", { state: { listedByType: "Agent / Broker", listedByName: u.name } })}
      onViewProjects={(u) => navigate("/projects", { state: { listedByType: "Agent / Broker", listedByName: u.name } })}
    />
  );
}
