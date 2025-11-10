import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, MapPin, Phone, Mail, Building, Shield, Briefcase, Award, FileText, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const EXPERIENCE_OPTIONS = ['<1 year', '1-3 years', '3-5 years', '5+ years'];
const INDUSTRY_OPTIONS = ['Tech', 'Design', 'Marketing', 'Finance', 'Education', 'Healthcare', 'Retail', 'Other'];
const SKILL_OPTIONS = [
  'Logo Design', 'Branding', 'Web Design', 'UI/UX', 'Graphic Design',
  'Content Writing', 'Copywriting', 'SEO', 'Social Media',
  'React', 'Python', 'Node.js', 'WordPress', 'Shopify',
  'Video Editing', 'Photography', 'Admin Support', 'Data Entry',
  'Customer Service', 'Project Management', 'Consulting'
];

export function ProfileView() {
  const { profile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('freelancer');

  const [profession, setProfession] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [experience, setExperience] = useState('');

  const [industry, setIndustry] = useState('');
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [postVisibility, setPostVisibility] = useState('public');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setCity(profile.city || '');
      setPhone(profile.phone || '');
      setCompany(profile.company || '');
      setRole(profile.role || 'freelancer');
      setProfession(profile.profession || '');
      setSkills(profile.skills || []);
      setBio(profile.bio || '');
      setExperience(profile.experience || '');
      setIndustry(profile.industry || '');
      setLookingFor(profile.looking_for || []);
      setPostVisibility(profile.post_visibility || 'public');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    setMessage('');

    const updateData: any = {
      full_name: fullName,
      city: city,
      phone: phone,
      company: company,
      role: role,
    };

    if (role === 'freelancer') {
      updateData.profession = profession;
      updateData.skills = skills;
      updateData.bio = bio;
      updateData.experience = experience;
    } else {
      updateData.industry = industry;
      updateData.looking_for = lookingFor;
      updateData.post_visibility = postVisibility;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', profile.id);

    if (error) {
      setMessage('Failed to update profile');
    } else {
      setMessage('Profile updated successfully');
      window.location.reload();
    }

    setSaving(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const addSkill = (skill: string) => {
    if (skills.length < 5 && !skills.includes(skill)) {
      setSkills([...skills, skill]);
    }
    setSkillInput('');
    setShowSkillDropdown(false);
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const addLookingFor = (item: string) => {
    if (!lookingFor.includes(item)) {
      setLookingFor([...lookingFor, item]);
    }
  };

  const removeLookingFor = (item: string) => {
    setLookingFor(lookingFor.filter(i => i !== item));
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Please sign in to view your profile</p>
      </div>
    );
  }

  const filteredSkills = SKILL_OPTIONS.filter(s =>
    s.toLowerCase().includes(skillInput.toLowerCase()) && !skills.includes(s)
  );

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Profile Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your account information</p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 shadow-sm space-y-8">
          <div className="flex items-center gap-4 pb-8 border-b border-gray-200 dark:border-gray-700">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{profile.full_name || 'User'}</h2>
              <p className="text-gray-500 dark:text-gray-400">{profile.email}</p>
              {profile.verified && (
                <div className="flex items-center gap-1 mt-1">
                  <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium">Verified</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              I am a
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => setRole('freelancer')}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                  role === 'freelancer'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Freelancer
              </button>
              <button
                onClick={() => setRole('poster')}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                  role === 'poster'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Poster
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </div>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </div>
            </label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  City
                </div>
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Cape Town"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Company (Optional)
                </div>
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Acme Inc."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone Number
              </div>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="+27 82 123 4567"
            />
          </div>

          {role === 'freelancer' && (
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Professional Information
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Profession / Role
                </label>
                <input
                  type="text"
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Graphic Designer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Skills (Max 5)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => {
                      setSkillInput(e.target.value);
                      setShowSkillDropdown(true);
                    }}
                    onFocus={() => setShowSkillDropdown(true)}
                    onBlur={() => setTimeout(() => setShowSkillDropdown(false), 200)}
                    disabled={skills.length >= 5}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder={skills.length >= 5 ? "Maximum skills reached" : "Type to search skills..."}
                  />

                  {showSkillDropdown && skillInput && filteredSkills.length > 0 && skills.length < 5 && (
                    <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {filteredSkills.slice(0, 10).map((skill) => (
                        <button
                          key={skill}
                          onClick={() => addSkill(skill)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white transition-colors"
                        >
                          {skill}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium"
                    >
                      {skill}
                      <button
                        onClick={() => removeSkill(skill)}
                        className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bio (Max 160 characters)
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 160))}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  placeholder="Brief description of what you do..."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {bio.length}/160 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Experience
                  </div>
                </label>
                <select
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select experience</option>
                  {EXPERIENCE_OPTIONS.map((exp) => (
                    <option key={exp} value={exp}>{exp}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {role === 'poster' && (
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Posting Preferences
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Industry
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select industry</option>
                  {INDUSTRY_OPTIONS.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Looking For
                </label>
                <div className="relative">
                  <select
                    onChange={(e) => {
                      addLookingFor(e.target.value);
                      e.target.value = '';
                    }}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Add a skill...</option>
                    {SKILL_OPTIONS.filter(s => !lookingFor.includes(s)).map((skill) => (
                      <option key={skill} value={skill}>{skill}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {lookingFor.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-medium"
                    >
                      {item}
                      <button
                        onClick={() => removeLookingFor(item)}
                        className="hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Post Visibility
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setPostVisibility('public')}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                      postVisibility === 'public'
                        ? 'bg-green-600 text-white shadow-lg shadow-green-600/20'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Public
                  </button>
                  <button
                    onClick={() => setPostVisibility('private')}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                      postVisibility === 'private'
                        ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Private
                  </button>
                </div>
              </div>
            </div>
          )}

          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl ${
                message.includes('success')
                  ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
              }`}
            >
              {message}
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
