import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import ClientDetail from "@/components/ClientDetail";

export default function ClientDetailPage() {
  const { id } = useParams();
  const clientId = parseInt(id);

  // Redirect to clients page if ID is invalid
  if (isNaN(clientId)) {
    window.location.href = "/clients";
    return null;
  }

  return (
    <ClientDetail clientId={clientId} />
  );
}
