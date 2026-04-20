import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import SurveyForm from "./SurveyForm";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function SurveyPage({ params }: PageProps) {
  const { token } = await params;

  const survey = await prisma.crmSatisfactionSurvey.findFirst({
    where: { token },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          designer: { select: { fullName: true } },
        },
      },
      client: { select: { id: true, name: true, firstName: true } },
    },
  });

  if (!survey) {
    notFound();
  }

  const designerName = survey.project?.designer?.fullName || "המעצבת";
  const projectName = survey.project?.name || "";
  const greetName = survey.client?.firstName || survey.client?.name || "";

  // Already filled — show a thank-you screen (no data exposed)
  if (survey.completedAt) {
    return (
      <main dir="rtl" className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: "linear-gradient(135deg, #f8f5ee 0%, #ede6d5 100%)" }}>
        <div className="max-w-md w-full bg-white/80 backdrop-blur rounded-2xl p-8 text-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">תודה רבה!</h1>
          <p className="text-gray-600">הביקורת שלך נשמרה בהצלחה. {designerName} מודה לך על הזמן שהשקעת.</p>
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
            ביקורת על העבודה של <strong>{designerName}</strong>
            {projectName && (
              <>
                {" · "}
                <span>פרויקט: {projectName}</span>
              </>
            )}
          </p>
        </div>

        <SurveyForm token={token} designerName={designerName} />
      </div>
    </main>
  );
}
