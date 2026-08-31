import { getLocalTestimonials } from "@/lib/testimonials-store";
import TestimonialsManager from "@/components/admin/TestimonialsManager";

export const dynamic = "force-dynamic";

export default async function AdminTestimonialsPage() {
  const testimonials = await getLocalTestimonials({ admin: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Testimonials</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Add, edit, delete, and reorder client testimonials shown on your homepage.
        </p>
      </div>
      <TestimonialsManager testimonials={testimonials} />
    </div>
  );
}
