import React, { useState, useEffect } from 'react';
import { X, Loader, Sparkles, Building2, Globe, FileText, MapPin, Phone, Mail } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";

interface CompanyData {
  id?: string;
  company_name: string;
  industry: string;
  website_url: string;
  about_company: string;
  address: string;
  phone: string;
  email: string;
}

interface CompanyDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CompanyData) => void;
  currentData?: CompanyData | null;
}

export default function CompanyDataModal({ isOpen, onClose, onSave, currentData }: CompanyDataModalProps) {
  const [activeMode, setActiveMode] = useState<'ai' | 'manual'>('manual');
  const [isLoading, setIsLoading] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [formData, setFormData] = useState<CompanyData>({
    company_name: '',
    industry: '',
    website_url: '',
    about_company: '',
    address: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    if (currentData) {
      setFormData(currentData);
    }
  }, [currentData]);

  const crawlWebsite = async () => {
    if (!websiteUrl.trim()) {
      alert('Please enter a website URL');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('crawl-website-data', {
        body: { websiteUrl }
      });

      if (error) throw error;

      if (data) {
        setFormData({
          company_name: data.companyName || '',
          industry: data.industry || '',
          website_url: websiteUrl,
          about_company: data.about || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || ''
        });
        setActiveMode('manual');
      }
    } catch (e) {
      console.error('Error crawling website:', e);
      
      // Fallback mock data for demo
      const mockData = {
        company_name: 'Example Company',
        industry: 'Technology',
        website_url: websiteUrl,
        about_company: 'A leading technology company focused on innovation and digital transformation.',
        address: '123 Main Street, City, State 12345',
        phone: '+1 (555) 123-4567',
        email: 'contact@example.com'
      };
      
      setFormData(mockData);
      setActiveMode('manual');
      alert('AI crawling unavailable. Using demo data. Please review and edit.');
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!formData.company_name || !formData.industry || !formData.website_url) {
      alert('Please fill in Company Name, Industry, and Website URL (required fields)');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('You must be logged in to save company data. Please sign in first.');
        setIsLoading(false);
        return;
      }

      const payload = {
        ...formData,
        user_id: user.id
      };

      let result;
      if (formData.id) {
        // Update existing profile
        result = await supabase
          .from('company_profiles')
          .update(payload)
          .eq('id', formData.id)
          .select();
      } else {
        // Insert new profile
        result = await supabase
          .from('company_profiles')
          .insert([payload])
          .select()
          .single();
        
        if (result.data) {
          setFormData({ ...formData, id: result.data.id });
        }
      }

      if (result.error) {
        console.error('Supabase error:', result.error);
        throw result.error;
      }

      onSave(formData);
      alert('Company data saved successfully!');
      onClose();
    } catch (e: unknown) {
      console.error('Error saving company data:', e);
      
      // Check if it's a table not found error
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      
      if (errorMessage.includes('relation "public.company_profiles" does not exist')) {
        alert('Database table not found. The company_profiles table needs to be created in your Supabase database. Please contact support or run the migration manually.');
      } else if (errorMessage.includes('JWT')) {
        alert('Authentication error. Please sign in again.');
      } else {
        alert(`Error saving data: ${errorMessage}. Please try again.`);
      }
    }
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-indigo-600"/>
            Company Data
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6"/>
          </button>
        </div>

        <div className="p-6">
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setActiveMode('ai')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                activeMode === 'ai'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Sparkles className="h-5 w-5"/>
              AI Company Data
            </button>
            <button
              onClick={() => setActiveMode('manual')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                activeMode === 'manual'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FileText className="h-5 w-5"/>
              Manual Entry
            </button>
          </div>

          {activeMode === 'ai' ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-6 border border-indigo-200">
                <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-600"/>
                  AI Website Crawler
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Enter your website URL and our AI will automatically extract your company information.
                </p>
                
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Globe className="h-4 w-4 inline mr-1"/>
                      Website URL
                    </label>
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://yourwebsite.com"
                      className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <button
                  onClick={crawlWebsite}
                  disabled={isLoading || !websiteUrl.trim()}
                  className="mt-4 w-full bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin"/>
                      Crawling Website...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5"/>
                      Crawl & Auto-Fill
                    </>
                  )}
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  💡 <strong>Tip:</strong> After AI crawling, you can review and edit the extracted information in the Manual Entry tab.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="Your Company Name"
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Industry <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="e.g., Technology, Healthcare, Finance"
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Globe className="h-4 w-4 inline mr-1"/>
                  Website URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  placeholder="https://yourwebsite.com"
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="h-4 w-4 inline mr-1"/>
                  About Company
                </label>
                <textarea
                  value={formData.about_company}
                  onChange={(e) => setFormData({ ...formData, about_company: e.target.value })}
                  placeholder="Brief description of your company, products, or services..."
                  className="w-full border border-gray-300 p-3 rounded-lg h-32 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Contact Information</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="h-4 w-4 inline mr-1"/>
                      Address
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Street Address, City, State, ZIP"
                      className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Phone className="h-4 w-4 inline mr-1"/>
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+1 (555) 123-4567"
                        className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Mail className="h-4 w-4 inline mr-1"/>
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="contact@company.com"
                        className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex-1 bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin"/>
                      Saving...
                    </>
                  ) : (
                    'Save Company Data'
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}