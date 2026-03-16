import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, MapPin, Phone, Mail, Building, Shield, Briefcase, Award, FileText, X, HelpCircle, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ChangePasswordModal } from './ChangePasswordModal';
import { ProfileSkeleton } from './LoadingSkeleton';

const MAJOR_CITIES = ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria'];
const SERVICE_CATEGORIES = ['Design', 'Web', 'Photography', 'Marketing', 'Video', 'Writing'];
const SERVICE_SKILLS = [
  'Logo Design', 'Branding', 'Web Design', 'UI/UX', 'Graphic Design',
  'Content Writing', 'Copywriting', 'SEO', 'Social Media',
  'React', 'Python', 'Node.js', 'WordPress', 'Shopify',
  'Video Editing', 'Photography', 'Admin Support', 'Data Entry',
  'Customer Service', 'Project Management', 'Consulting'
];

export function ProfileView() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [intent, setIntent] = useState('offer_services');
  const [discoveryPreference, setDiscoveryPreference] = useState('my_city');
  const [postVisibility, setPostVisibility] = useState('public');

  const [serviceCategory, setServiceCategory] = useState('');
  const [servicesOffered, setServicesOffered] = useState<string[]>([]);
  const [workMode, setWorkMode] = useState('both');

  const [helpNeeded, setHelpNeeded] = useState<string[]>([]);
  const [preferredWorkMode, setPreferredWorkMode] = useState('either');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  const [showGuideMessage, setShowGuideMessage] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setCity(profile.city || '');
      setArea(profile.area || '');
      setPhone(profile.phone || '');
      setCompanyName(profile.company_name || '');
      setIntent(profile.intent || 'offer_services');
      setDiscoveryPreference(profile.discovery_preference || 'my_city');
      setPostVisibility(profile.post_visibility || 'public');
      setServiceCategory(profile.service_category || '');
      setServicesOffered(profile.services_offered || []);
      setWorkMode(profile.work_mode || 'both');
      setHelpNeeded(profile.help_needed || []);
      setPreferredWorkMode(profile.work_mode || 'either');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;

    if (!fullName.trim()) {
      setMessage('Please enter your name');
      return;
    }

    if (!city.trim()) {
      setMessage('Please select a city');
      return;
    }

    if (!discoveryPreference) {
      setMessage('Please select where you want to be discovered');
      return;
    }

    if (intent === 'offer_services') {
      if (!serviceCategory) {
        setMessage('Please select a service category');
        return;
      }
      if (servicesOffered.length === 0) {
        setMessage('Please add at least one service or skill');
        return;
      }
      if (!workMode) {
        setMessage('Please select how you work');
        return;
      }
    }

    if (intent === 'post_request') {
      if (helpNeeded.length === 0) {
        setMessage('Please add at least one type of help needed');
        return;
      }
      if (!preferredWorkMode) {
        setMessage('Please select your preferred work mode');
        return;
      }
    }

    setSaving(true);
    setMessage('Saving...');

    const updateData: any = {
      full_name: fullName,
      city: city,
      area: area,
      phone: phone,
      company_name: companyName,
      intent: intent,
      discovery_preference: discoveryPreference,
      post_visibility: postVisibility,
    };

    if (intent === 'offer_services') {
      updateData.service_category = serviceCategory;
      updateData.services_offered = servicesOffered;
      updateData.work_mode = workMode;
      updateData.help_needed = null;
    } else {
      updateData.help_needed = helpNeeded;
      updateData.work_mode = preferredWorkMode;
      updateData.service_category = null;
      updateData.services_offered = null;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', profile.id);

    setSaving(false);

    if (error) {
      setMessage(`Failed to update profile: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    } else {
      await refreshProfile();
      setMessage('Profile updated successfully');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const addService = (service: string) => {
    if (servicesOffered.length < 5 && !servicesOffered.includes(service)) {
      setServicesOffered([...servicesOffered, service]);
    }
    setSkillInput('');
    setShowSkillDropdown(false);
  };

  const removeService = (service: string) => {
    setServicesOffered(servicesOffered.filter(s => s !== service));
  };

  const addHelpNeeded = (item: string) => {
    if (helpNeeded.length < 5 && !helpNeeded.includes(item)) {
      setHelpNeeded([...helpNeeded, item]);
    }
    setSkillInput('');
    setShowSkillDropdown(false);
  };

  const removeHelpNeeded = (item: string) => {
    setHelpNeeded(helpNeeded.filter(i => i !== item));
  };

  const handleShowGuideAgain = () => {
    setShowGuideMessage(true);
    setTimeout(() => setShowGuideMessage(false), 3000);
    setTimeout(() => window.location.reload(), 500);
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Please sign in to view your profile</p>
      </div>
    );
  }

  const filteredSkills = SERVICE_SKILLS.filter(s =>
    s.toLowerCase().includes(skillInput.toLowerCase()) &&
    !servicesOffered.includes(s) &&
    !helpNeeded.includes(s)
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
              How do you want to use Openwall?
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => setIntent('offer_services')}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all cursor-pointer ${
                  intent === 'offer_services'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                aria-label="Select offer services"
              >
                Offer services
              </button>
              <button
                onClick={() => setIntent('post_request')}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all cursor-pointer ${
                  intent === 'post_request'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                aria-label="Select post request"
              >
                Post a request
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Your name <span className="text-red-500">*</span>
              </div>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                Company or brand (Optional)
              </div>
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
                  City / Town <span className="text-red-500">*</span>
                </div>
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
              >
                <option value="">Select city</option>
                {MAJOR_CITIES.map((cityName) => (
                  <option key={cityName} value={cityName}>{cityName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Area / Suburb (Optional)
                </div>
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


          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Where do you want to be discovered? <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setDiscoveryPreference('near_me')}
                className={`py-3 px-4 rounded-xl font-medium transition-all cursor-pointer ${
                  discoveryPreference === 'near_me'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Near me only
              </button>
              <button
                onClick={() => setDiscoveryPreference('my_city')}
                className={`py-3 px-4 rounded-xl font-medium transition-all cursor-pointer ${
                  discoveryPreference === 'my_city'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                My city
              </button>
              <button
                onClick={() => setDiscoveryPreference('anywhere')}
                className={`py-3 px-4 rounded-xl font-medium transition-all cursor-pointer ${
                  discoveryPreference === 'anywhere'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Anywhere
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Visibility <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => setPostVisibility('public')}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all cursor-pointer ${
                  postVisibility === 'public'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Public
              </button>
              <button
                onClick={() => setPostVisibility('private')}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all cursor-pointer ${
                  postVisibility === 'private'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Private
              </button>
            </div>
          </div>

          {intent === 'offer_services' && (
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Services Offered
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Primary service category <span className="text-red-500">*</span>
                </label>
                <select
                  value={serviceCategory}
                  onChange={(e) => setServiceCategory(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
                >
                  <option value="">Select category</option>
                  {SERVICE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Services or skills you offer <span className="text-red-500">*</span> (Max 5)
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
                    disabled={servicesOffered.length >= 5}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    placeholder={servicesOffered.length >= 5 ? "Maximum services reached" : "Type to search: Logo design, websites, branding"}
                  />

                  {showSkillDropdown && skillInput && filteredSkills.length > 0 && servicesOffered.length < 5 && (
                    <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {filteredSkills.slice(0, 10).map((skill) => (
                        <button
                          key={skill}
                          onClick={() => addService(skill)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white transition-colors cursor-pointer"
                          aria-label={`Add ${skill} service`}
                        >
                          {skill}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {servicesOffered.map((service) => (
                    <span
                      key={service}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium"
                    >
                      {service}
                      <button
                        onClick={() => removeService(service)}
                        className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  How do you work? <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setWorkMode('on_site')}
                    className={`py-3 px-4 rounded-xl font-medium transition-all cursor-pointer ${
                      workMode === 'on_site'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    On-site
                  </button>
                  <button
                    onClick={() => setWorkMode('remote')}
                    className={`py-3 px-4 rounded-xl font-medium transition-all cursor-pointer ${
                      workMode === 'remote'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Remote
                  </button>
                  <button
                    onClick={() => setWorkMode('both')}
                    className={`py-3 px-4 rounded-xl font-medium transition-all cursor-pointer ${
                      workMode === 'both'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Both
                  </button>
                </div>
              </div>
            </div>
          )}

          {intent === 'post_request' && (
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                What you're looking for
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type of help needed <span className="text-red-500">*</span> (Max 5)
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
                    disabled={helpNeeded.length >= 5}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    placeholder={helpNeeded.length >= 5 ? "Maximum items reached" : "Type: Logo design, website, photography"}
                  />

                  {showSkillDropdown && skillInput && filteredSkills.length > 0 && helpNeeded.length < 5 && (
                    <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {filteredSkills.slice(0, 10).map((skill) => (
                        <button
                          key={skill}
                          onClick={() => addHelpNeeded(skill)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white transition-colors cursor-pointer"
                          aria-label={`Add ${skill} to help needed`}
                        >
                          {skill}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {helpNeeded.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-medium"
                    >
                      {item}
                      <button
                        onClick={() => removeHelpNeeded(item)}
                        className="hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full p-0.5 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Preferred work mode <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setPreferredWorkMode('on_site')}
                    className={`py-3 px-4 rounded-xl font-medium transition-all cursor-pointer ${
                      preferredWorkMode === 'on_site'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    On-site
                  </button>
                  <button
                    onClick={() => setPreferredWorkMode('remote')}
                    className={`py-3 px-4 rounded-xl font-medium transition-all cursor-pointer ${
                      preferredWorkMode === 'remote'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Remote
                  </button>
                  <button
                    onClick={() => setPreferredWorkMode('either')}
                    className={`py-3 px-4 rounded-xl font-medium transition-all cursor-pointer ${
                      preferredWorkMode === 'either'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Either
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
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </motion.button>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 shadow-sm mt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5" />
            Account Security
          </h3>

          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Keep your account secure by regularly updating your password.
          </p>

          <button
            onClick={() => setShowPasswordModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            Change Password
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 shadow-sm mt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <HelpCircle className="w-5 h-5" />
            Help & Support
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

          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Need a refresher on how Openwall works? View the onboarding guide again.
          </p>

          <button
            onClick={handleShowGuideAgain}
            className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all cursor-pointer"
          >
            Show Guide Again
          </button>
        </div>

        <AnimatePresence>
          {showPasswordModal && (
            <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
