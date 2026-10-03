"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const ALL_DOCUMENTS = "all";

export function DocumentScopeSelect({
  id,
  documents,
  value,
  onChange,
}: {
  id: string;
  documents: { id: string; name: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder="Tous les documents" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_DOCUMENTS}>Tous les documents de la matière</SelectItem>
        {documents.map((doc) => (
          <SelectItem key={doc.id} value={doc.id}>
            {doc.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
