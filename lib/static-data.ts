import type { DesignItem, VideoItem } from "@/lib/types/database";

export const STATIC_DESIGNS: DesignItem[] = [
  { id: "1", title: "Cyprus", image: "/designs/CYPRUS.jpg", color: "from-violet-700 to-indigo-900", aspectRatio: "square" },
  { id: "2", title: "Opportunity", image: "/designs/Opportunity.jpg", color: "from-yellow-700 to-orange-900", aspectRatio: "portrait" },
  { id: "3", title: "Live Study", image: "/designs/LIVE STUDY.jpg", color: "from-green-700 to-emerald-900", aspectRatio: "square" },
  { id: "16", title: "PTE Score", image: "/designs/PTE SCORE.jpg", color: "from-purple-700 to-fuchsia-900", aspectRatio: "square" },
  { id: "15", title: "Constitution Day", image: "/designs/CONSTITUTIONDAY.jpg", color: "from-blue-700 to-indigo-900", aspectRatio: "square" },
  { id: "17", title: "New Year 2083", image: "/designs/NEW YEAR - 2083.jpg", color: "from-yellow-700 to-orange-900", aspectRatio: "portrait" },
  { id: "4", title: "Children's Day", image: "/designs/Children's Day.jpg", color: "from-pink-700 to-rose-900", aspectRatio: "square" },
  { id: "22", title: "Republic Day", image: "/designs/REPUBLIC-DAY.jpg", color: "from-red-700 to-yellow-900", aspectRatio: "square" },
  { id: "29", title: "Wolverhampton", image: "/designs/Wolverhampton.jpg", color: "from-blue-700 to-cyan-900", aspectRatio: "portrait" },
  { id: "30", title: "Your Pathway to Australia", image: "/designs/Your Pathway to Australia.jpg", color: "from-emerald-700 to-teal-900", aspectRatio: "portrait" },
  { id: "10", title: "Huddersfield", image: "/designs/HUDDERSFIELD final.jpg", color: "from-slate-700 to-gray-900", aspectRatio: "square" },
  { id: "19", title: "One Roof", image: "/designs/ONE-ROOF.jpg", color: "from-sky-700 to-blue-900", aspectRatio: "square" },
  { id: "9", title: "Home Loan", image: "/designs/HOME LOAN.jpg", color: "from-blue-700 to-cyan-900", aspectRatio: "square" },
];

export const STATIC_VIDEOS: VideoItem[] = [
  { id: "1", title: "May 2 Reel", src: "/videos/MAY 2.mp4", duration: "0:45", description: "High-energy promotional video for a local brand", featured: true, clipStart: 0, clipEnd: 8 },
  { id: "2", title: "Beans n Bun", src: "/videos/May 5.mp4", duration: "0:30", description: "Cinematic food reel for BEANS n BUN", featured: false, clipStart: 2, clipEnd: 10 },
  { id: "3", title: "Success Education", src: "/videos/May 11.mp4", duration: "1:00", description: "Full ad production for Success Education", featured: false, clipStart: 5, clipEnd: 15 },
  { id: "4", title: "First Property", src: "/videos/FIRST PROPERTY.mp4", duration: "0:20", description: "Animated logo intro with VFX", featured: false, clipStart: 0, clipEnd: 6 },
  { id: "5", title: "Trade Courses", src: "/videos/TRADE COURSES.mp4", duration: "1:30", description: "Cinematic product launch video", featured: false, clipStart: 10, clipEnd: 22 },
];

export const PORTRAIT_DESIGN_IMAGES = new Set([
  ...STATIC_DESIGNS.filter((d) => d.aspectRatio === "portrait").map((d) => d.image),
  "/designs/_2 Graduates - Final.jpg",
]);

export const STATIC_VIDEO_BY_SRC = Object.fromEntries(
  STATIC_VIDEOS.map((v) => [v.src, v])
);
