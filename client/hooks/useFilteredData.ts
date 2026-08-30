import { useMemo } from "react";

interface UseFilteredDataOptions<T> {
  searchValue?: string;
  searchFields?: (keyof T)[];
  filterField?: keyof T;
  filterValue?: string;
}

export function useFilteredData<T>(
  data: T[],
  {
    searchValue = "",
    searchFields = [],
    filterField,
    filterValue = "all",
  }: UseFilteredDataOptions<T>
) {
  return useMemo(() => {
    const search = searchValue.toLowerCase().trim();

    return data.filter((item) => {
      // Search
      const matchesSearch =
        !search ||
        searchFields.some((field) =>
          String(item[field] ?? "")
            .toLowerCase()
            .includes(search)
        );

      // Filter
      const matchesFilter =
        !filterField ||
        !filterValue ||
        filterValue === "all" ||
        String(item[filterField]) === filterValue;

      return matchesSearch && matchesFilter;
    });
  }, [
    data,
    searchValue,
    searchFields,
    filterField,
    filterValue,
  ]);
}