import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { CustomerEditor } from "@/components/customer-editor";
import { channelLabel } from "@/lib/demo-data";
import { avatarForCustomer, type CrmDetail, type CrmMode } from "@/lib/crm";

export function CustomerDetail({
  mode,
  notice,
  stageReady,
  customer,
}: {
  mode: CrmMode;
  notice: string | null;
  stageReady: boolean;
  customer: CrmDetail;
}) {
  const phoneHref = customer.phone ? `tel:${customer.phone.replace(/\s/g, "")}` : null;

  return (
    <div className="px-4 pt-2 pb-8">
      <Link href="/customers" className="text-sm font-semibold text-mcw">
        All customers
      </Link>
      <div className="mt-3 flex items-center gap-3">
        <Avatar spec={avatarForCustomer(customer.id, customer.name, customer.channel)} />
        <div className="min-w-0">
          <h2 className="truncate text-[1.35rem] font-extrabold tracking-[-0.03em] text-ink">
            {customer.name}
          </h2>
          <p className="truncate text-sm font-medium text-muted">
            {customer.channel ? channelLabel(customer.channel) : "Chat"}
          </p>
        </div>
      </div>
      {notice ? (
        <p className="mt-3 rounded-[22px] bg-mcw-soft px-3.5 py-3 text-sm leading-5 font-medium text-[#3C3458]">
          {notice}
        </p>
      ) : null}
      <dl className="mt-4 space-y-2 rounded-3xl bg-white p-4 ring-1 ring-[#F0EAF8]">
        <div>
          <dt className="text-[11px] font-bold tracking-wide text-muted uppercase">Phone</dt>
          <dd className="mt-0.5 text-sm font-semibold break-words text-ink">
            {phoneHref ? (
              <a href={phoneHref} className="text-mcw">
                {customer.phone}
              </a>
            ) : (
              "No phone saved"
            )}
          </dd>
        </div>
        {customer.email ? (
          <div>
            <dt className="text-[11px] font-bold tracking-wide text-muted uppercase">Email</dt>
            <dd className="mt-0.5 text-sm font-semibold break-words text-ink">
              <a href={`mailto:${customer.email}`} className="text-mcw">
                {customer.email}
              </a>
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-[11px] font-bold tracking-wide text-muted uppercase">
            Last message
          </dt>
          <dd className="mt-0.5 text-sm font-semibold text-ink">{customer.lastMessageLabel}</dd>
        </div>
      </dl>
      <CustomerEditor
        mode={mode}
        stageReady={stageReady}
        id={customer.id}
        stage={customer.stage}
        notes={customer.notes}
      />
      <section className="mt-4">
        <h3 className="text-sm font-bold text-ink">Recent messages</h3>
        {customer.messages.length === 0 ? (
          <p className="mt-2 text-sm leading-5 text-muted">No messages yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {customer.messages.map((message) => (
              <li key={message.id} className="rounded-2xl bg-[#F6F4FB] px-3.5 py-2.5">
                <p className="text-[11px] font-bold tracking-wide text-mcw uppercase">
                  {message.who}
                  {message.when ? ` · ${message.when}` : ""}
                </p>
                <p className="mt-1 text-sm leading-5 break-words text-[#3C3A46]">
                  {message.content}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="mt-4">
        <h3 className="text-sm font-bold text-ink">Payments</h3>
        {customer.payments.length === 0 ? (
          <p className="mt-2 text-sm leading-5 text-muted">No payments yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {customer.payments.map((payment) => (
              <li
                key={payment.id}
                className="flex items-baseline justify-between gap-3 rounded-2xl bg-white px-3.5 py-3 ring-1 ring-[#F0EAF8]"
              >
                <span className="min-w-0">
                  <span className="block font-bold text-ink">{payment.amountLabel}</span>
                  <span className="text-xs font-semibold text-muted">{payment.statusLabel}</span>
                </span>
                {payment.when ? (
                  <span className="shrink-0 text-[12px] text-[#A0A4AE]">{payment.when}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
