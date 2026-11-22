import type { Metadata } from "next";
import Link from "next/link";
import { PayScopeLandingHeader } from "@/components/landing/PayScopeLandingHeader";
import { publicPageMetadata, publicPages } from "@/lib/public-site";

export const metadata: Metadata = {
  ...publicPages["/accessibility"],
  ...publicPageMetadata("/accessibility"),
};

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-[#040711] text-slate-100">
      <PayScopeLandingHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-3xl space-y-10 px-4 py-12 sm:px-6 lg:py-20"
      >
        <div className="space-y-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">Accessibility</h1>
          <p className="leading-relaxed text-slate-300">
            We want everyone to be able to review their payments and subscriptions. PayScope aims to meet{" "}
            <a className="policy-link" href="https://www.w3.org/TR/WCAG22/">
              WCAG 2.2 Level AA
            </a>
            . We are still assessing coverage across all pages and assistive technologies.
          </p>
        </div>

        <section aria-labelledby="using-payscope" className="space-y-3 leading-relaxed text-slate-300">
          <h2 id="using-payscope" className="text-xl font-bold text-white">Using PayScope</h2>
          <p>
            Use <strong>Skip to content</strong> to bypass navigation when using a keyboard. Links and buttons
            show a focus indicator as you tab through the page.
          </p>
          <p>
            Charts and relationship graphs can be harder to use with assistive technology or at high zoom.
            In your workspace,{" "}
            <Link className="policy-link" href="/payments">Payments</Link>{" "}
            lists individual transactions, and{" "}
            <Link className="policy-link" href="/commitments">Subscriptions</Link>{" "}
            lists recurring charges.
          </p>
        </section>

        <section aria-labelledby="report-barrier" className="space-y-3 leading-relaxed text-slate-300">
          <h2 id="report-barrier" className="text-xl font-bold text-white">Report an accessibility barrier</h2>
          <p>
            Tell us which page you used, what you were trying to do and what got in your way.
            Include your browser or assistive technology if it helps. Use sample data or redact personal details
            from anything you share.
          </p>
          <a
            className="policy-link inline-block"
            href="https://github.com/vinaybhadane/PayScope/issues/new?title=Accessibility%3A%20"
          >
            Report an accessibility issue on GitHub
          </a>
        </section>
      </main>
    </div>
  );
}
