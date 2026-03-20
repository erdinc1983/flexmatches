import type { Metadata } from "next";
import type { ReactNode } from "react";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?username=eq.${encodeURIComponent(username)}&select=username,full_name,bio,city,sports,fitness_level,avatar_url,is_pro&limit=1`;

  let profile: {
    username: string;
    full_name: string | null;
    bio: string | null;
    city: string | null;
    sports: string[] | null;
    fitness_level: string | null;
    avatar_url: string | null;
    is_pro: boolean | null;
  } | null = null;

  try {
    const res = await fetch(url, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
      next: { revalidate: 3600 },
    });
    const data = await res.json();
    profile = Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch {}

  if (!profile) {
    return {
      title: `@${username} | FlexMatches`,
      description: "Find your fitness partner on FlexMatches.",
    };
  }

  const sportsStr = (profile.sports ?? []).slice(0, 3).join(", ");
  const descParts = [
    sportsStr && `Sports: ${sportsStr}`,
    profile.city && `📍 ${profile.city}`,
    profile.fitness_level && `${profile.fitness_level.charAt(0).toUpperCase() + profile.fitness_level.slice(1)} level`,
    profile.bio,
  ].filter(Boolean);

  const description = descParts.slice(0, 3).join(" · ") || "Find your fitness partner on FlexMatches.";
  const title = profile.full_name
    ? `${profile.full_name} (@${profile.username})${profile.is_pro ? " 💎" : ""} | FlexMatches`
    : `@${profile.username}${profile.is_pro ? " 💎" : ""} | FlexMatches`;

  const images = profile.avatar_url
    ? [{ url: profile.avatar_url, width: 400, height: 400, alt: `@${profile.username}` }]
    : [{ url: "https://www.flexmatches.com/icon-512.png", width: 512, height: 512, alt: "FlexMatches" }];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://www.flexmatches.com/u/${username}`,
      siteName: "FlexMatches",
      images,
      type: "profile",
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: images.map((i) => i.url),
    },
  };
}

export default function PublicProfileLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
