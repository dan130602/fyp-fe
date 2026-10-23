// Searchable single-select table of advisors for the upload dialog.
import { Search } from "lucide-react";
import { useState } from "react";
import type { Advisor } from "@/advisors/advisors-api.ts";
import { filterAdvisors } from "@/advisors/filter-advisors.ts";
import { useAdvisors } from "@/advisors/use-advisors.ts";
import { Input } from "@/components/ui/input.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";

interface AdvisorPickerProps {
  selected: Advisor | null;
  onSelect: (advisor: Advisor) => void;
}

export default function AdvisorPicker({ selected, onSelect }: AdvisorPickerProps) {
  const [search, setSearch] = useState("");
  const advisors = useAdvisors();

  if (advisors.isPending) return <p className="text-sm">Loading advisors…</p>;
  if (advisors.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Couldn't load advisors. Close the dialog and try again.
      </p>
    );
  }

  const visible = filterAdvisors(advisors.data, search);

  return (
    <div className="grid gap-3">
      <div className="relative">
        <Search
          className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or employee ID"
          aria-label="Search advisors"
          className="pl-8"
        />
      </div>
      <div className="max-h-80 overflow-y-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <span className="sr-only">Select</span>
              </TableHead>
              <TableHead>Employee ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Department</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((advisor) => {
              const isSelected = selected?.id === advisor.id;
              return (
                <TableRow
                  key={advisor.id}
                  data-state={isSelected ? "selected" : undefined}
                  // Shared default bg-muted is the same colour as the muted department text.
                  className="cursor-pointer hover:bg-accent/60 data-[state=selected]:bg-accent"
                  onClick={() => onSelect(advisor)}
                >
                  <TableCell>
                    <input
                      type="radio"
                      name="advisor"
                      checked={isSelected}
                      onChange={() => onSelect(advisor)}
                      aria-label={`${advisor.fullName} (${advisor.employeeId})`}
                    />
                  </TableCell>
                  <TableCell className="font-mono tabular-nums">{advisor.employeeId}</TableCell>
                  <TableCell>{advisor.fullName}</TableCell>
                  <TableCell className="text-muted-foreground">{advisor.department}</TableCell>
                </TableRow>
              );
            })}
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                  No advisors match "{search.trim()}".
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
