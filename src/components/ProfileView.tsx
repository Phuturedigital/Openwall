import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, MapPin, Mail, Building, Shield, Briefcase, FileText, X, HelpCircle, Lock, Instagram, Linkedin, Globe, Phone, Camera, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { SA_CITIES } from '../lib/constants';
import { ChangePasswordModal } from './ChangePasswordModal';

const SERVICE_SKILLS = [
  // Design
  'Logo Design', 'Branding', 'Brand Identity', 'Web Design', 'UI/UX', 'Graphic Design',
  'Illustration', 'Motion Graphics', 'Print Design', 'Packaging Design', 'Figma', 'Adobe XD',
  'Photoshop', 'Illustrator', 'InDesign', 'Canva', 'Pitch Decks', 'Infographics',
  // Writing & Content
  'Content Writing', 'Copywriting', 'Blog Writing', 'Technical Writing', 'Proofreading',
  'Editing', 'Grant Writing', 'Press Releases', 'Email Marketing', 'Newsletter Writing',
  'Script Writing', 'Creative Writing', 'Academic Writing', 'Proposal Writing',
  // Development
  'React', 'Next.js', 'Vue.js', 'Angular', 'TypeScript', 'JavaScript', 'Python',
  'Node.js', 'Django', 'FastAPI', 'PHP', 'Laravel', 'Ruby on Rails', 'Flutter',
  'React Native', 'iOS Development', 'Android Development', 'WordPress', 'Shopify',
  'WooCommerce', 'Webflow', 'Wix', 'Squarespace', 'REST APIs', 'GraphQL',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Firebase', 'Supabase', 'AWS', 'Docker',
  // Marketing & Growth
  'SEO', 'Google Ads', 'Facebook Ads', 'Social Media', 'Social Media Management',
  'Influencer Marketing', 'Content Strategy', 'Growth Hacking', 'Email Campaigns',
  'Community Management', 'TikTok Marketing', 'Instagram Marketing', 'LinkedIn Marketing',
  'Analytics', 'Google Analytics', 'CRO', 'Affiliate Marketing',
  // Tech & IT
  'IT Support', 'Network Administration', 'Cybersecurity', 'Cloud Computing',
  'System Administration', 'Data Analysis', 'Data Science', 'Machine Learning',
  'AI Prompting', 'Tableau', 'Power BI', 'Excel', 'Google Sheets', 'Automation',
  // Media & Creative
  'Video Editing', 'Videography', 'Photography', 'Product Photography', 'Drone Photography',
  'Podcast Editing', 'Audio Production', 'Music Production', 'Voice Over', 'Animation',
  '2D Animation', '3D Modelling', 'After Effects', 'Premiere Pro',
  // Business & Operations
  'Admin Support', 'Virtual Assistant', 'Data Entry', 'Customer Service',
  'Project Management', 'Scrum / Agile', 'Business Analysis', 'Process Improvement',
  'Consulting', 'Strategy', 'Financial Modelling', 'Bookkeeping', 'Accounting',
  'Legal Research', 'HR Consulting', 'Recruitment', 'Training & Development',
  'Translations', 'Event Planning', 'Public Relations',
];

export function ProfileView() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [bio, setBio] = useState('');

  const [servicesOffered, setServicesOffered] = useState<string[]>([]);
  const [helpNeeded, setHelpNeeded] = useState<string[]>([]);
  const [workMode, setWorkMode] = useState('both');
  const [discoveryPreference, setDiscoveryPreference] = useState('my_city');
  const [postVisibility, setPostVisibility] = useState('public');

  const [profession, setProfession] = useState('');
  const [skills, setSkills] = useState<string[]>([]);

  const [instagramUrl, setInstagramUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [servicesInput, setServicesInput] = useState('');
  const [helpInput, setHelpInput] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [showServicesDropdown, setShowServicesDropdown] = useState(false);
  const [showHelpDropdown, setShowHelpDropdown] = useState(false);
  const [showSkillsDropdown, setShowSkillsDropdown] = useState(false);
  const [showGuideMessage, setShowGuideMessage] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [dbSkillSuggestions, setDbSkillSuggestions] = useState<string[]>([]);

  // Fetch popular skills/services already used by other profiles for live suggestions
  const fetchDbSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setDbSkillSuggestions([]); return; }
    const lower = q.toLowerCase();
    const { data } = await supabase
      .from('profiles')
      .select('skills, services_offered')
      .limit(200);
    if (!data) return;
    const all = data.flatMap((p) => [...(p.skills || []), ...(p.services_offered || [])]);
    const unique = [...new Set(all)]
      .filter((s) => s && s.toLowerCase().includes(lower))
      .sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(lower);
        const bStarts = b.toLowerCase().startsWith(lower);
        return aStarts === bStarts ? 0 : aStarts ? -1 : 1;
      })
      .slice(0, 8);
    setDbSkillSuggestions(unique);
  }, []);

  useEffect(() => {
    const active = servicesInput || skillsInput || helpInput;
    const timer = setTimeout(() => fetchDbSuggestions(active), 300);
    return () => clearTimeout(timer);
  }, [servicesInput, skillsInput, helpInput, fetchDbSuggestions]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setCity(profile.city || '');
      setArea(profile.area || '');
      setPhone(profile.phone || '');
      setCompanyName(profile.company_name || '');
      setBio(profile.bio || '');
      setServicesOffered(profile.services_offered || []);
      setHelpNeeded(profile.help_needed || []);
      setWorkMode(profile.work_mode || 'both');
      setDiscoveryPreference(profile.discovery_preference || 'my_city');
      setPostVisibility(profile.post_visibility || 'public');
      setProfession(profile.profession || '');
      setSkills(profile.skills || []);
      setInstagramUrl(profile.instagram_url || '');
      setLinkedinUrl(profile.linkedin_url || '');
      setWebsiteUrl(profile.website_url || '');
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (!file.type.startsWith('image/')) {
      dispatchToast('Please select an image file', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      dispatchToast('Image must be under 2 MB', 'error');
      return;
    }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${profile.id}/avatar.${ext}`;
      // upsert so re-uploads overwrite the old file
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      // Add cache-buster so browser picks up the new image
      const bustUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: bustUrl })
        .eq('id', profile.id);
      if (dbError) throw dbError;

      setAvatarUrl(bustUrl);
      await refreshProfile();
      dispatchToast('Profile picture updated', 'success');
    } catch (err: unknown) {
      const e = err as { message?: string };
      dispatchToast(e.message || 'Failed to upload image', 'error');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const dispatchToast = (message: string, type: 'success' | 'error' | 'info') => {
    window.dispatchEvent(new CustomEvent('profile-saved', { detail: { message, type } }));
  };

  const handleSave = async () => {
    if (!profile) return;
    if (!fullName.trim()) { dispatchToast('Please enter your name', 'error'); return; }
    if (!city.trim()) { dispatchToast('Please select a city', 'error'); return; }

    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        city,
        area,
        phone: phone.trim() || null,
        company_name: companyName,
        bio,
        profession: profession.trim() || null,
        skills,
        services_offered: servicesOffered,
        help_needed: helpNeeded,
        work_mode: workMode,
        discovery_preference: discoveryPreference,
        post_visibility: postVisibility,
        instagram_url: instagramUrl.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
        website_url: websiteUrl.trim() || null,
      })
      .eq('id', profile.id);

    setSaving(false);
    if (error) {
      dispatchToast(`Failed to update profile: ${error.message}`, 'error');
    } else {
      await refreshProfile();
      dispatchToast('Profile updated successfully', 'success');
    }
  };

  const addService = (service: string) => {
    if (servicesOffered.length < 8 && !servicesOffered.includes(service)) {
      setServicesOffered([...servicesOffered, service]);
    }
    setServicesInput('');
    setShowServicesDropdown(false);
  };

  const removeService = (service: string) => setServicesOffered(servicesOffered.filter((s) => s !== service));

  const addHelpNeeded = (item: string) => {
    if (helpNeeded.length < 8 && !helpNeeded.includes(item)) {
      setHelpNeeded([...helpNeeded, item]);
    }
    setHelpInput('');
    setShowHelpDropdown(false);
  };

  const removeHelpNeeded = (item: string) => setHelpNeeded(helpNeeded.filter((i) => i !== item));

  const addSkill = (skill: string) => {
    if (skills.length < 10 && !skills.includes(skill)) {
      setSkills([...skills, skill]);
    }
    setSkillsInput('');
    setShowSkillsDropdown(false);
  };

  const removeSkill = (skill: string) => setSkills(skills.filter((s) => s !== skill));

  const handleShowGuideAgain = () => {
    setShowGuideMessage(true);
    setTimeout(() => window.location.reload(), 500);
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Please sign in to view your profile</p>
      </div>
    );
  }

  const blendSuggestions = (input: string, excluded: string[]) => {
    const lower = input.toLowerCase();
    const fromStatic = SERVICE_SKILLS.filter(
      (s) => s.toLowerCase().includes(lower) && !excluded.includes(s)
    ).sort((a, b) => {
      const aStarts = a.toLowerCase().startsWith(lower);
      const bStarts = b.toLowerCase().startsWith(lower);
      return aStarts === bStarts ? 0 : aStarts ? -1 : 1;
    });
    const fromDb = dbSkillSuggestions.filter((s) => !excluded.includes(s) && !fromStatic.includes(s));
    return [...fromStatic, ...fromDb].slice(0, 10);
  };

  const filteredServicesSkills = servicesInput ? blendSuggestions(servicesInput, servicesOffered) : [];
  const filteredHelpSkills = helpInput ? blendSuggestions(helpInput, helpNeeded) : [];
  const filteredSkillsList = skillsInput ? blendSuggestions(skillsInput, skills) : [];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Profile Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your account information</p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 shadow-sm space-y-8">

          {/* Avatar & identity header */}
          <div className="flex items-center gap-5 pb-8 border-b border-gray-200 dark:border-gray-700">
            {/* Clickable avatar with upload overlay */}
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-gray-200 dark:ring-gray-700 hover:ring-blue-500 transition-all group relative cursor-pointer"
                aria-label="Change profile picture"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    {profile.full_name ? (
                      <span className="text-2xl font-bold text-white">
                        {profile.full_name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    ) : (
                      <User className="w-10 h-10 text-white" />
                    )}
                  </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                  {uploadingAvatar ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-white" />
                  )}
                </div>
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
                {uploadingAvatar ? 'Uploading…' : 'Click to change'}
              </span>
            </div>

            <div className="mt-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{profile.full_name || 'User'}</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{profile.email}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Max 2 MB · JPG, PNG, WebP, GIF</p>
              {profile.verified && (
                <div className="flex items-center gap-1 mt-1">
                  <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium">Verified</span>
                </div>
              )}
            </div>
          </div>

          {/* Basic info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-2"><User className="w-4 h-4" />Your name <span className="text-red-500">*</span></div>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-2"><Building className="w-4 h-4" />Company or brand <span className="text-gray-400 font-normal">(optional)</span></div>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
              placeholder="Acme Inc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-2"><Briefcase className="w-4 h-4" />Profession / Job title <span className="text-gray-400 font-normal">(optional)</span></div>
            </label>
            <input
              type="text"
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
              placeholder="e.g. Graphic Designer, Developer, Consultant"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-2"><Phone className="w-4 h-4" />Phone number <span className="text-gray-400 font-normal">(optional)</span></div>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
              placeholder="+27 82 000 0000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-2"><Mail className="w-4 h-4" />Email</div>
            </label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              About you <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 cursor-pointer"
              placeholder="A short bio — what you do, what you're looking for..."
            />
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4" />City / Town <span className="text-red-500">*</span></div>
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
              >
                <option value="">Select city</option>
                {SA_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4" />Area / Suburb <span className="text-gray-400 font-normal">(optional)</span></div>
              </label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
                placeholder="Sandton, Newlands, Umhlanga..."
              />
            </div>
          </div>

          {/* Services offered */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
                <Briefcase className="w-5 h-5" />Services I offer
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Add skills or services you can help others with (max 8)</p>
            </div>
            <div className="relative">
              <input
                type="text"
                value={servicesInput}
                onChange={(e) => { setServicesInput(e.target.value); setShowServicesDropdown(true); }}
                onFocus={() => setShowServicesDropdown(true)}
                onBlur={() => setTimeout(() => setShowServicesDropdown(false), 200)}
                disabled={servicesOffered.length >= 8}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                placeholder={servicesOffered.length >= 8 ? 'Maximum reached' : 'Search: Logo design, web dev, photography...'}
              />
              {showServicesDropdown && servicesInput && filteredServicesSkills.length > 0 && servicesOffered.length < 8 && (
                <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {filteredServicesSkills.slice(0, 10).map((skill) => (
                    <button key={skill} onClick={() => addService(skill)} className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white transition-colors cursor-pointer">
                      {skill}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {servicesOffered.map((service) => (
                <span key={service} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium">
                  {service}
                  <button onClick={() => removeService(service)} className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5 transition-colors cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
                <Shield className="w-5 h-5" />Skills
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Technical skills and tools you're proficient in (max 10)</p>
            </div>
            <div className="relative">
              <input
                type="text"
                value={skillsInput}
                onChange={(e) => { setSkillsInput(e.target.value); setShowSkillsDropdown(true); }}
                onFocus={() => setShowSkillsDropdown(true)}
                onBlur={() => setTimeout(() => setShowSkillsDropdown(false), 200)}
                disabled={skills.length >= 10}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                placeholder={skills.length >= 10 ? 'Maximum reached' : 'Search: React, Python, Photoshop...'}
              />
              {showSkillsDropdown && skillsInput && filteredSkillsList.length > 0 && skills.length < 10 && (
                <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {filteredSkillsList.slice(0, 10).map((skill) => (
                    <button key={skill} onClick={() => addSkill(skill)} className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white transition-colors cursor-pointer">
                      {skill}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span key={skill} className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium">
                  {skill}
                  <button onClick={() => removeSkill(skill)} className="hover:bg-green-200 dark:hover:bg-green-800 rounded-full p-0.5 transition-colors cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Help needed */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
                <FileText className="w-5 h-5" />What I'm looking for
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Add types of help you may need from others (max 8)</p>
            </div>
            <div className="relative">
              <input
                type="text"
                value={helpInput}
                onChange={(e) => { setHelpInput(e.target.value); setShowHelpDropdown(true); }}
                onFocus={() => setShowHelpDropdown(true)}
                onBlur={() => setTimeout(() => setShowHelpDropdown(false), 200)}
                disabled={helpNeeded.length >= 8}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                placeholder={helpNeeded.length >= 8 ? 'Maximum reached' : 'Search: Logo design, website, photography...'}
              />
              {showHelpDropdown && helpInput && filteredHelpSkills.length > 0 && helpNeeded.length < 8 && (
                <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {filteredHelpSkills.slice(0, 10).map((skill) => (
                    <button key={skill} onClick={() => addHelpNeeded(skill)} className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white transition-colors cursor-pointer">
                      {skill}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {helpNeeded.map((item) => (
                <span key={item} className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-medium">
                  {item}
                  <button onClick={() => removeHelpNeeded(item)} className="hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full p-0.5 transition-colors cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Work mode */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Work preference
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['on_site', 'remote', 'both'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setWorkMode(mode)}
                  className={`py-3 px-4 rounded-xl font-medium transition-all cursor-pointer ${
                    workMode === mode
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {mode === 'on_site' ? 'On-site' : mode === 'remote' ? 'Remote' : 'Both'}
                </button>
              ))}
            </div>
          </div>

          {/* Social & web links */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              Links <span className="text-xs font-normal text-gray-400 dark:text-gray-500">(optional)</span>
            </label>
            <div className="space-y-3">
              <div className="relative">
                <Instagram className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400 pointer-events-none" />
                <input
                  type="url"
                  placeholder="instagram.com/yourhandle"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="relative">
                <Linkedin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 pointer-events-none" />
                <input
                  type="url"
                  placeholder="linkedin.com/in/yourname"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="relative">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="url"
                  placeholder="yourwebsite.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Discovery & visibility */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Where do you want to be discovered?
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'near_me', label: 'Near me' },
                  { value: 'my_city', label: 'My city' },
                  { value: 'anywhere', label: 'Anywhere' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setDiscoveryPreference(value)}
                    className={`py-3 px-4 rounded-xl font-medium transition-all cursor-pointer ${
                      discoveryPreference === value
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Note visibility
              </label>
              <div className="flex gap-4">
                {(['public', 'private'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setPostVisibility(v)}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all cursor-pointer capitalize ${
                      postVisibility === v
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </motion.button>
        </div>

        {/* Security */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 shadow-sm mt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5" />Account Security
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Keep your account secure by regularly updating your password.</p>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            Change Password
          </button>
        </div>

        {/* Help */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 shadow-sm mt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <HelpCircle className="w-5 h-5" />Help & Support
          </h3>
          {showGuideMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 mb-4"
            >
              Reloading to show the onboarding guide...
            </motion.div>
          )}
          <p className="text-gray-600 dark:text-gray-400 mb-4">Need a refresher on how Openwall works? View the onboarding guide again.</p>
          <button
            onClick={handleShowGuideAgain}
            className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all cursor-pointer"
          >
            Show Guide Again
          </button>
        </div>

        <AnimatePresence>
          {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
