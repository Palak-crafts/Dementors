import { useState, useEffect } from "react";

export function useActiveRole() {
  const [role, setRole] = useState(() => {
    return localStorage.getItem("dss_user_role") || "national";
  });

  useEffect(() => {
    const handleRoleUpdate = () => {
      setRole(localStorage.getItem("dss_user_role") || "national");
    };

    window.addEventListener("roleChanged", handleRoleUpdate);
    window.addEventListener("storage", handleRoleUpdate);

    return () => {
      window.removeEventListener("roleChanged", handleRoleUpdate);
      window.removeEventListener("storage", handleRoleUpdate);
    };
  }, []);

  // Map selected role to exact database district string
  const districtFilter =
    role === "chamoli"
      ? "Chamoli"
      : role === "darbhanga"
      ? "Darbhanga"
      : role === "wayanad"
      ? "Wayanad"
      : null;

  return {
    role,
    isNational: role === "national",
    districtFilter,
  };
}