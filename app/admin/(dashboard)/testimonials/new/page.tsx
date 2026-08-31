import TestimonialForm from "@/components/admin/TestimonialForm";

export const dynamic = "force-dynamic";

export default function NewTestimonialPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">New Testimonial</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Add a new client testimonial that will appear on your homepage.
        </p>
      </div>
      <TestimonialForm />
    </div>
  );
}
