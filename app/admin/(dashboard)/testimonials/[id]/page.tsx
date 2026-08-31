import { notFound } from "next/navigation";
import { getLocalTestimonial } from "@/lib/testimonials-store";
import TestimonialForm from "@/components/admin/TestimonialForm";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditTestimonialPage({ params }: PageProps) {
  const { id } = await params;
  const testimonial = await getLocalTestimonial(id);

  if (!testimonial) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Edit Testimonial</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Update the details for <span className="text-white">{testimonial.author}</span>&apos;s testimonial.
        </p>
      </div>
      <TestimonialForm initial={testimonial} />
    </div>
  );
}
