"use client";

import Link from "next/link";
import { useId, useState, useSyncExternalStore } from "react";
import { Avatar } from "@/components/avatar";
import { PaAvatar } from "@/components/pa-avatar";
import { StagePill } from "@/components/stage-pill";
import {
  applyCrmEdit,
  avatarForCustomer,
  contactLine,
  matchesCustomerQuery,
  readStoredCrmEdits,
  subscribeCrmEdits,
  type CrmEdits,
  type CrmListItem,
  type CrmMode,
} from "@/lib/crm";

const emptyEdits: CrmEdits = {};

export function CustomerList({
  mode,
  notice,
  customers,
}: {
  mode: CrmMode | "unavailable";
  notice: string | null;
  customers: CrmListItem[];
}) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const edits = useSyncExternalStore(
    subscribeCrmEdits,
    readStoredCrmEdits,
    () => emptyEdits,
  );
  const rows = customers.map((customer) =>
    mode === "demo" ? applyCrmEdit(customer, edits[customer.id]) : customer,
  );
  const visible = rows.filter((customer) => matchesCustomerQuery(customer, query));
  const intro =
    mode === "unavailable"
      ? "Your customers will show up here."
      : mode === "demo"
        ? "Sample customers from the inbox. Search, set a stage, and jot a note."
        : mode === "sample"
          ? "Sample people for now. Your own customers land here after they message you."
          : customers.length === 0
            ? "No customers yet. When someone messages you, they show up here."
            : "Your customers, in one place.";

  return (
    <div className="px-4 pt-2 pb-8">
      <h2 className="text-[1.35rem] font-extrabold tracking-[-0.03em] text-ink">
        Customers
      </h2>
      <p className="mt-1 text-sm leading-5 text-muted">{intro}</p>
      {notice ? (
        <p className="mt-3 rounded-[22px] bg-mcw-soft px-3.5 py-3 text-sm leading-5 font-medium text-[#3C3458]">
          {notice}
        </p>
      ) : null}
      {customers.length > 0 ? (
        <div className="mt-4">
          <label className="sr-only" htmlFor={searchId}>
            Search customers
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name or phone"
            autoComplete="off"
            className="w-full rounded-2xl bg-[#F6F4FB] px-4 py-3 text-base font-semibold text-ink ring-1 ring-transparent outline-none placeholder:font-medium placeholder:text-[#B0ABBE] focus:ring-mcw"
          />
        </div>
      ) : null}
      {customers.length === 0 ? (
        <div className="px-2 py-10 text-center">
          <PaAvatar size="empty" className="mx-auto" />
        </div>
      ) : visible.length === 0 ? (
        <p className="px-2 py-10 text-center text-sm font-medium text-muted">
          No one matches that.
        </p>
      ) : (
        <ul className="mt-2">
          {visible.map((customer) => (
            <li key={customer.id}>
              <Link
                href={`/customers/${customer.id}`}
                className="flex w-full gap-3 rounded-2xl px-1 py-3 hover:bg-[#FAF8FF]"
              >
                <Avatar spec={avatarForCustomer(customer.id, customer.name, customer.channel)} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-3">
                    <span className="truncate text-[15px] font-semibold text-ink">
                      {customer.name}
                    </span>
                    <time className="shrink-0 text-[12px] text-[#A0A4AE]">
                      {customer.lastMessageLabel}
                    </time>
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-[13.5px] text-[#8E939C]">
                      {contactLine(customer)}
                    </span>
                    <StagePill stage={customer.stage} />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
