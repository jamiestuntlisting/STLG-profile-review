"use client";

import { useEffect, useState } from "react";

interface ProfileData {
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  headshotUrl: string | null;
  height: number | null;
  weight: number | null;
  shirtNeck: number | null;
  shirtSleeve: number | null;
  pantsWaist: number | null;
  pantsInseam: number | null;
  shoe: number | null;
  hipsWomen: number | null;
  chestWomen: number | null;
  hat: string | null;
  glove: string | null;
  jacketSize: string | null;
  jacketLength: string | null;
  tShirt: string | null;
  identifyAs: string | null;
  hiredAs: string | null;
  aboutMe: string | null;
  imdb: string | null;
  phoneNumber: string | null;
  facebook: string | null;
  instagram: string | null;
  twitter: string | null;
  youtube: string | null;
  personalWebsite: string | null;
  unionStatus: string | null;
  ethnicity: string | null;
  hairColor: string | null;
  wardrobeInfo: string | null;
  skills: { skill_name: string; level: string; category: string }[];
  reels: { reel_url: string; title: string }[];
  doubledActors: { name: string }[];
}

interface ProfileTabProps {
  stuntlistingUserId: number;
}

export default function ProfileTab({ stuntlistingUserId }: ProfileTabProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch(`/api/stuntlisting/profile/${stuntlistingUserId}`);
        if (!res.ok) throw new Error("Failed to load profile");
        const data = await res.json();
        setProfile(data.profile);
      } catch {
        setError("Could not load profile data");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [stuntlistingUserId]);

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return <div className="p-6 text-red-600">{error || "Profile not available"}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with headshot */}
      <div className="flex items-start gap-4">
        {profile.headshotUrl ? (
          <img
            src={profile.headshotUrl}
            alt={profile.name}
            className="w-24 h-24 rounded-lg object-cover border border-gray-200"
          />
        ) : (
          <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-2xl font-bold">
            {profile.firstName?.charAt(0) || "?"}
          </div>
        )}
        <div>
          <h2 className="text-xl font-bold text-gray-900">{profile.name}</h2>
          {profile.identifyAs && (
            <p className="text-sm text-gray-500">{profile.identifyAs}</p>
          )}
          {profile.unionStatus && (
            <p className="text-xs text-gray-400 mt-1">{profile.unionStatus}</p>
          )}
        </div>
      </div>

      {/* Bio */}
      {profile.aboutMe && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">About</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{profile.aboutMe}</p>
        </div>
      )}

      {/* Sizes */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Sizes</h3>
        <div className="grid grid-cols-3 gap-2 text-sm">
          {profile.height != null && (
            <div className="bg-gray-50 rounded p-2">
              <span className="text-gray-500">Height:</span>{" "}
              <span className="font-medium text-gray-900">{Math.floor(profile.height / 12)}&apos;{profile.height % 12}&quot;</span>
            </div>
          )}
          {profile.weight != null && (
            <div className="bg-gray-50 rounded p-2">
              <span className="text-gray-500">Weight:</span>{" "}
              <span className="font-medium text-gray-900">{profile.weight} lbs</span>
            </div>
          )}
          {profile.shirtNeck != null && (
            <div className="bg-gray-50 rounded p-2">
              <span className="text-gray-500">Neck:</span>{" "}
              <span className="font-medium text-gray-900">{profile.shirtNeck}&quot;</span>
            </div>
          )}
          {profile.shirtSleeve != null && (
            <div className="bg-gray-50 rounded p-2">
              <span className="text-gray-500">Sleeve:</span>{" "}
              <span className="font-medium text-gray-900">{profile.shirtSleeve}&quot;</span>
            </div>
          )}
          {profile.pantsWaist != null && (
            <div className="bg-gray-50 rounded p-2">
              <span className="text-gray-500">Waist:</span>{" "}
              <span className="font-medium text-gray-900">{profile.pantsWaist}&quot;</span>
            </div>
          )}
          {profile.pantsInseam != null && (
            <div className="bg-gray-50 rounded p-2">
              <span className="text-gray-500">Inseam:</span>{" "}
              <span className="font-medium text-gray-900">{profile.pantsInseam}&quot;</span>
            </div>
          )}
          {profile.shoe != null && (
            <div className="bg-gray-50 rounded p-2">
              <span className="text-gray-500">Shoe:</span>{" "}
              <span className="font-medium text-gray-900">{profile.shoe}</span>
            </div>
          )}
          {profile.jacketSize && (
            <div className="bg-gray-50 rounded p-2">
              <span className="text-gray-500">Jacket:</span>{" "}
              <span className="font-medium text-gray-900">{profile.jacketSize}</span>
            </div>
          )}
          {profile.tShirt && (
            <div className="bg-gray-50 rounded p-2">
              <span className="text-gray-500">T-Shirt:</span>{" "}
              <span className="font-medium text-gray-900">{profile.tShirt}</span>
            </div>
          )}
          {profile.hat && (
            <div className="bg-gray-50 rounded p-2">
              <span className="text-gray-500">Hat:</span>{" "}
              <span className="font-medium text-gray-900">{profile.hat}</span>
            </div>
          )}
          {profile.glove && (
            <div className="bg-gray-50 rounded p-2">
              <span className="text-gray-500">Glove:</span>{" "}
              <span className="font-medium text-gray-900">{profile.glove}</span>
            </div>
          )}
        </div>
      </div>

      {/* Skills */}
      {profile.skills.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Stunt Skills</h3>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((skill, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
              >
                {skill.skill_name}
                {skill.level && (
                  <span className="ml-1 text-blue-400">({skill.level})</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stunt Reels */}
      {profile.reels.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Stunt Reels</h3>
          <div className="space-y-2">
            {profile.reels.map((reel, i) => (
              <a
                key={i}
                href={reel.reel_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-blue-600 hover:text-blue-800 underline"
              >
                {reel.title || reel.reel_url}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Doubled Actors */}
      {profile.doubledActors.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Doubled For</h3>
          <div className="flex flex-wrap gap-2">
            {profile.doubledActors.map((d, i) => (
              <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                {d.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Links */}
      <div className="flex flex-wrap gap-3 pt-2">
        {profile.imdb && (
          <a href={profile.imdb} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
            IMDb
          </a>
        )}
        {profile.instagram && (
          <a href={`https://instagram.com/${profile.instagram}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
            Instagram
          </a>
        )}
        {profile.facebook && (
          <a href={profile.facebook} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
            Facebook
          </a>
        )}
        {profile.youtube && (
          <a href={profile.youtube} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
            YouTube
          </a>
        )}
        {profile.personalWebsite && (
          <a href={profile.personalWebsite} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
            Website
          </a>
        )}
      </div>
    </div>
  );
}
