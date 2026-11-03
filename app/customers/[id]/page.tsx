import type { Metadata } from "next";
import Link from "next/link";
import { CustomerDetail } from "@/components/customer-detail";
import { loadCrmCustomer } from "@/lib/db/crm";

type CustomerPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: CustomerPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await loadCrmCustomer(id);
  return {
    title: result.kind === "ready" ? result.customer.name : "Customer",
  };
}

export default async function CustomerPage({ params }: CustomerPageProps) {
  const { id } = await params;
  const result = await loadCrmCustomer(id);

  if (result.kind === "unavailable") {
    return (
      <div className="px-4 pt-2 pb-8">
        <Link href="/customers" className="text-sm font-semibold text-mcw">
          All customers
        </Link>
        <h2 className="mt-3 text-[1.35rem] font-extrabold tracking-[-0.03em] text-ink">
          Customer
        </h2>
        <p className="mt-3 rounded-[22px] bg-mcw-soft px-3.5 py-3 text-sm leading-5 font-medium text-[#3C3458]">
          {result.notice}
        </p>
      </div>
    );
  }

  if (result.kind === "missing") {
    return (
      <div className="px-4 pt-2 pb-8">
        <h2 className="text-[1.35rem] font-extrabold tracking-[-0.03em] text-ink">
          That customer is not on your list.
        </h2>
        <Link href="/customers" className="mt-4 inline-flex text-sm font-semibold text-mcw">
          All customers
        </Link>
      </div>
    );
  }

  return (
    <CustomerDetail
      mode={result.mode}
      notice={result.notice}
      stageReady={result.stageReady}
      customer={result.customer}
    />
  );
}
