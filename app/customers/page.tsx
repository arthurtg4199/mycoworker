import type { Metadata } from "next";
import { CustomerList } from "@/components/customer-list";
import { loadCrmList } from "@/lib/db/crm";

export const metadata: Metadata = {
  title: "Customers",
};

export default async function CustomersPage() {
  const board = await loadCrmList();
  return (
    <CustomerList
      mode={board.mode}
      notice={board.notice}
      customers={board.customers}
    />
  );
}
