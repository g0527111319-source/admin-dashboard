import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import SupplierReviewForm from "./SupplierReviewForm";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function SupplierReviewPage({ params }: PageProps) {
  const { token } = await params;

  const review = await prisma.supplierDesignerReview.findUnique({
    where: { token },
    include: {
      supplier: { select: { name: true, contactName: true } },
      designer: { select: { firstName: true, fullName: true } },
    },
  });

  if (!review) {
    notFound();
  }

  const supplierName = review.supplier?.name || review.supplier?.contactName || "הספק";
  const greetName = review.designer?.firstName || review.designer?.fullName || "";

  if (review.completedAt) {
    return (
      <main dir="rtl" className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: "linear-gradient(135deg, #f8f5ee 0%, #ede6d5 100%)" }}>
        <div className="max-w-md w-full bg-white/80 backdrop-blur rounded-2xl p-8 text-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">תודה רבה!</h1>
          <p className="text-gray-600">הביקורת שלך נשמרה בהצלחה. {supplierName} מודה לך על הזמן.</p>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen px-4 py-12" style={{ background: "linear-gradient(135deg, #f8f5ee 0%, #ede6d5 100%)" }}>
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            {greetName ? `${greetName}, ` : ""}נשמח לשמוע את דעתך
          </h1>
          <p className="text-[#7a6f50] text-sm">
            ביקורת על העבודה עם <strong>{supplierName}</strong>
          </p>
        </div>

        <SupplierReviewForm token={token} supplierName={supplierName} />
      </div>
    </main>
  );
}
