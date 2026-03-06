import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Menu, X, TrendingUp, FileText, Sparkles, Search, BarChart3, Copy, Check, Loader, Download, ExternalLink, Building2, Lock, Clipboard, CornerUpLeft, CheckCircle, Shield, AlertTriangle, ShoppingCart, Newspaper, TrendingDown } from 'lucide-react';
import KeywordTagInput from './KeywordTagInput';
import { supabase } from "@/integrations/supabase/client";
import CompanyDataModal from './CompanyDataModal';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface TrendingTopic {
  title: string;
  summary: string;
  source: string;
  date: string;
  url: string;
  relevance?: string;
  engagement?: string;
  selectedIdea?: string | null;
}

interface CompetitorScore {
  aiCitation: number;
  mediaAuthority: number;
  newsVolume: number;
  sentimentPositivity: number;
  topicLeadership: number;
  [key: string]: number;
}

interface Competitor {
  name: string;
  scores: CompetitorScore;
  trend: 'up' | 'down';
  gapAnalysis: string;
}

interface CompetitorData {
  userCompany: {
    name: string;
    scores: CompetitorScore;
  };
  competitors: Competitor[];
  competitiveIntelligence: string[];
}

interface VerificationResult {
  found: boolean;
  blocked?: boolean;
  manuallyConfirmed?: boolean;
}

interface Order {
  id: string;
  prTitle: string;
  productName: string;
  price: string;
  date: string;
  prContent: string;
}

export default function PRDashboard() {
  const [activeTab, setActiveTab] = useState('trending');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCompanyDataModalOpen, setIsCompanyDataModalOpen] = useState(false);
  const [companyData, setCompanyData] = useState<{
    company_name: string;
    industry: string;
    website_url: string;
    about_company: string;
    address: string;
    phone: string;
    email: string;
  } | null>(null);

  // Core State
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [keyMessage, setKeyMessage] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>([]);
  
  // Loading States
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isVerifying, setIsVerifying] = useState<{[key: string]: boolean}>({});
  
  // Error States
  const [marketError, setMarketError] = useState<string | null>(null);
  
  // Data States
  const [generatedPR, setGeneratedPR] = useState('');
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [competitorData, setCompetitorData] = useState<CompetitorData | null>(null);
  const [verificationResults, setVerificationResults] = useState<{[key: string]: VerificationResult}>({});
  const [selectedWidgetStyle, setSelectedWidgetStyle] = useState(1);
  const [widgetResolution, setWidgetResolution] = useState('starter');
  const [verifyUrl, setVerifyUrl] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<VerificationResult | null>(null);
  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState(false);
  
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRefineDialog, setShowRefineDialog] = useState(false);
  const [showGeneratedView, setShowGeneratedView] = useState(false);
  const [showContentIdeas, setShowContentIdeas] = useState<{[key: string]: boolean}>({});
  const [showFocusDropdown, setShowFocusDropdown] = useState(false);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  
  // Form State
  const [quoteAttribution, setQuoteAttribution] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [url, setUrl] = useState('');
  const [prPrompt, setPrPrompt] = useState('');
  const [refinementInstructions, setRefinementInstructions] = useState('');
  const [refinementCount, setRefinementCount] = useState(0);
  const [selectedTopic, setSelectedTopic] = useState<TrendingTopic | null>(null);
  const [contentIdeas, setContentIdeas] = useState<{[key: string]: string[]}>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [toast, setToast] = useState<{message: string, type: string} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [prFormData, setPrFormData] = useState({
    about: '',
    quote: '',
    quoteName: '',
    keywords: [] as string[],
    wordCount: '500',
    mainFocus: 'Company News',
    theme: 'thought-provoking',
    featuredImage: null as File | null,
    videoUrl: '',
    mapsEmbed: ''
  });

  const industryRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);

  // Load orders from localStorage on mount
  useEffect(() => {
    const savedOrders = JSON.parse(localStorage.getItem('prOrders') || '[]');
    setOrders(savedOrders);
    
    // Check for premium unlock
    const hasPremiumOrder = savedOrders.some(order => 
      order.productName === 'Standard PR Package' || order.productName === 'Premium PR Package'
    );
    setIsPremiumUnlocked(hasPremiumOrder);
    
    // Check for successful payment redirect
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      setActiveTab('orders');
      setShowThankYou(true);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
    loadCompanyData();
  }, []);

  const loadCompanyData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading company data:', error);
        return;
      }

      if (data) {
        setCompanyData(data);
      }
    } catch (e) {
      console.error('Error loading company data:', e);
    }
  };

  const handleCompanyDataSave = (data: {
    company_name: string;
    industry: string;
    website_url: string;
    about_company: string;
    address: string;
    phone: string;
    email: string;
  }) => {
    setCompanyData(data);
  };

  const OUTLETS = [
    'Yahoo Finance', 'NCN Central', 'NCN Platte Valley', 'NCN Metro', 'NCN MidPlains', 
    'NCN Panhandle', 'NCN South East', 'NCN North East', 'NCN', 'NCN River County', 
    'openPR', 'Minyanville', 'The Chronicle Journal', 'My Mother Lode', 'Starkville Daily News', 
    'Business Insider', 'Associated Press', 'Digital Journal', 'Inter Press Service', 
    'Street Insider', 'NewsBreak', 'TechBullion', 'Big News Network', 'MSN'
  ];

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchTrendingTopics = async (industryName: string, kw: string[]) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('trending-topics', {
        body: { industry: industryName }
      });

      if (error) throw error;
      
      if (data && data.topics && data.topics.length > 0) {
        setTrendingTopics(data.topics);
      } else {
        // Fallback to mock data if AI returns nothing
        const topics = Array.from({ length: 12 }, (_, i) => {
          const topicTypes = [
            { prefix: 'AI Revolution in', focus: 'automation and innovation' },
            { prefix: 'Sustainability Trends for', focus: 'eco-friendly practices' },
            { prefix: 'Market Growth Analysis:', focus: 'expansion opportunities' },
            { prefix: 'Digital Transformation in', focus: 'technology adoption' },
            { prefix: 'Consumer Insights for', focus: 'changing preferences' },
            { prefix: 'Investment Opportunities in', focus: 'funding and growth' }
          ];
          
          const type = topicTypes[i % topicTypes.length];
          const keywordFocus = kw[i % kw.length] || industryName;
          
          return {
            title: `${type.prefix} ${industryName}: ${keywordFocus.charAt(0).toUpperCase() + keywordFocus.slice(1)} Driving Change`,
            summary: `Recent analysis reveals how ${keywordFocus} is transforming the ${industryName} landscape. Industry leaders are leveraging ${type.focus} to gain competitive advantage.`,
            source: OUTLETS[i % OUTLETS.length],
            date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            url: `https://example.com/article/${i + 1}`
          };
        });
        
        setTrendingTopics(topics);
      }
      setError(null);
      
    } catch (e) {
      console.error('Error:', e);
      setError('Demo mode active');
    }
    
    setIsLoading(false);
  };

  const runPRAnalysis = async () => {
    const ind = industryRef.current?.value || industry;
    const site = urlRef.current?.value || url;
    const kw = keywords;
    
    setIndustry(ind);
    setUrl(site);
    setSidebarOpen(false);
    
    await fetchTrendingTopics(ind, kw);
    setActiveTab('topics');
    
    if (!error) {
      showToast('Analysis complete!');
    }
  };

  const scanMarket = async () => {
    if (!companyName || !industry) {
      showToast('Please set your company name and industry in settings', 'error');
      return;
    }

    setIsScanning(true);
    setMarketError(null);
    
    try {
      console.log('Starting market scan with:', { companyName, industry });
      
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session status:', session ? 'authenticated' : 'not authenticated');
      
      const { data, error } = await supabase.functions.invoke('competitor-analysis', {
        body: { companyName, industry },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {}
      });

      console.log('Competitor analysis response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from competitor analysis');
      }

      setCompetitorData(data);
      showToast('Market scan complete!', 'success');
    } catch (error) {
      console.error('Market scan error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to scan market';
      setMarketError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const verifyWidgetPlacement = async () => {
    if (!verifyUrl.trim()) {
      showToast('Please enter a URL', 'error');
      return;
    }
    
    setIsVerifying(true);
    setVerificationStatus(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('verify-widget-placement', {
        body: { websiteUrl: verifyUrl }
      });

      if (error) throw error;
      
      if (data) {
        setVerificationStatus(data);
        if (data.found) {
          showToast('Widget verified!');
        } else if (data.blocked) {
          showToast('Verification blocked - you can manually confirm', 'error');
        } else {
          showToast('Widget not found', 'error');
        }
      }
    } catch (e) {
      console.error('Error:', e);
      showToast('Verification failed', 'error');
    }
    
    setIsVerifying(false);
  };

  const generateContentIdeas = async (topic) => {
    const topicId = topic.title;
    setShowContentIdeas({ ...showContentIdeas, [topicId]: true });
    
    if (contentIdeas[topicId]) return;
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const ideas = [
      `How ${industry} Leaders Can Leverage ${topic.title.split(':')[0]} for Growth`,
      `5 Key Takeaways from Recent ${industry} Analysis`,
      `The Future Impact on ${industry} Businesses`,
      `Expert Opinion: What This Means for Your ${industry} Strategy`
    ];
    
    const selectedIdeas = ideas.slice(0, Math.floor(Math.random() * 2) + 3);
    setContentIdeas({ ...contentIdeas, [topicId]: selectedIdeas });
  };

  const selectTopicForPR = (topic, ideaTitle = null) => {
    setSelectedTopic({ ...topic, selectedIdea: ideaTitle });
    setActiveTab('pr');
    showToast('Topic selected!');
  };

  const clearForm = () => {
    setPrFormData({
      about: '',
      quote: '',
      quoteName: '',
      keywords: [],
      wordCount: '500',
      mainFocus: 'Company News',
      theme: 'thought-provoking',
      featuredImage: null,
      videoUrl: '',
      mapsEmbed: ''
    });
    setSelectedTopic(null);
    showToast('Form cleared');
  };

  const handleCheckout = async (priceId: string, productName: string) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId,
          customerEmail: '',
          customerName: companyName
        }
      });

      if (error) throw error;

      if (data?.url) {
        const checkoutWindow = window.open(data.url, '_blank');
        
        const newOrder = {
          id: Date.now().toString(),
          prTitle: generatedPR ? generatedPR.split('<h1>')[1]?.split('</h1>')[0] || 'Press Release' : 'Press Release',
          productName,
          price: priceId === 'price_1SVMlPF7VMmZPCV7wEhuva5m' ? '$0.50' : 
                 priceId === 'price_1SVMldF7VMmZPCV7qTmVeIef' ? '$1.00' : '$2.00',
          date: new Date().toLocaleDateString(),
          prContent: generatedPR
        };
        
        const existingOrders = JSON.parse(localStorage.getItem('prOrders') || '[]');
        localStorage.setItem('prOrders', JSON.stringify([...existingOrders, newOrder]));
        
        const checkWindow = setInterval(() => {
          if (checkoutWindow && checkoutWindow.closed) {
            clearInterval(checkWindow);
            setOrders(JSON.parse(localStorage.getItem('prOrders') || '[]'));
            setShowThankYou(true);
            setActiveTab('orders');
            showToast('Order completed!');
            setTimeout(() => setShowThankYou(false), 10000);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      showToast('Failed to create checkout session', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const generatePressRelease = async () => {
    if (!prFormData.about || !prFormData.quote) {
      showToast('Please fill in About and Quote fields', 'error');
      return;
    }
    
    setIsLoading(true);
    setShowGeneratedView(false);
    setRefinementCount(0);
    
    try {
      const finalPrompt = prPrompt
        .replace(/{companyName}/g, companyName)
        .replace(/{industry}/g, industry)
        .replace(/{websiteUrl}/g, url)
        .replace(/{mainFocus}/g, prFormData.mainFocus)
        .replace(/{theme}/g, prFormData.theme)
        .replace(/{targetWords}/g, prFormData.wordCount)
        .replace(/{keywordsText}/g, keywords.join(', '))
        .replace(/{about}/g, prFormData.about)
        .replace(/{quote}/g, prFormData.quote)
        .replace(/{quoteAttribution}/g, quoteAttribution);

      const { data, error } = await supabase.functions.invoke('generate-press-release', {
        body: {
          companyName,
          industry,
          websiteUrl: url,
          mainFocus: prFormData.mainFocus,
          theme: prFormData.theme,
          wordCount: prFormData.wordCount,
          keywords,
          about: prFormData.about,
          quote: prFormData.quote,
          quoteAttribution,
          customPrompt: finalPrompt
        }
      });

      if (error) throw error;
      
      if (data && data.pressRelease) {
        setGeneratedPR(data.pressRelease);
        setShowGeneratedView(true);
        showToast('Press Release generated!');
      } else {
        throw new Error('No press release generated');
      }
    } catch (e) {
      console.error('Error:', e);
      showToast('Error generating PR', 'error');
      
      const pr = `<h1>${companyName} Announces Major Development</h1>
<p><strong>FOR IMMEDIATE RELEASE</strong></p>
<p>${prFormData.about}</p>
<p><em>"${prFormData.quote}"</em> said <strong>${quoteAttribution}</strong>.</p>
<h2>About ${companyName}</h2>
<p>${companyName} is a leading company in the ${industry} industry, committed to delivering exceptional value to clients. Visit <a href="${url}" target="_blank">${url}</a> for more information.</p>
<h2>Contact Information</h2>
<p>For press inquiries, please visit ${url}</p>`;
      
      setGeneratedPR(pr);
      setShowGeneratedView(true);
    }
    setIsLoading(false);
  };

  const refinePressRelease = async () => {
    if (!refinementInstructions.trim()) {
      showToast('Please provide refinement instructions', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('refine-press-release', {
        body: {
          currentContent: generatedPR,
          refinementInstructions,
          refinementCount
        }
      });

      if (error) throw error;
      
      if (data && data.refinedContent) {
        setGeneratedPR(data.refinedContent);
        setRefinementCount(data.refinementCount);
        setRefinementInstructions('');
        setShowRefineDialog(false);
        showToast('Press Release refined!');
      } else {
        throw new Error('No refined content returned');
      }
    } catch (e) {
      console.error('Error:', e);
      const errorMsg = e.message || 'Error refining PR';
      showToast(errorMsg, 'error');
    }
    setIsLoading(false);
  };

  const getWidgetEmbedCode = () => {
    const logos = widgetResolution === 'premium' && isPremiumUnlocked
      ? ['Yahoo Finance', 'Business Insider', 'Forbes', 'TechCrunch', 'Wired', 'Bloomberg']
      : ['Yahoo Finance', 'Business Insider', 'Forbes'];

    const styles = {
      1: `<div style="font-family: sans-serif; padding: 20px; text-align: center; background: white;">
  <p style="font-size: 12px; color: #666; margin-bottom: 15px;">AS SEEN ON</p>
  <div style="display: flex; gap: 20px; justify-content: center; align-items: center; flex-wrap: wrap;">
    <img src="/as-seen-on1.png" alt="Media outlets" style="height: 30px;">
  </div>
</div>`,
      2: `<div style="font-family: Georgia, serif; padding: 30px; text-align: center; background: rgba(255,255,255,0.05); backdrop-filter: blur(10px); border-radius: 10px;">
  <h3 style="font-size: 18px; color: #333; margin-bottom: 20px;">Featured In</h3>
  <div style="display: flex; gap: 25px; justify-content: center; align-items: center; flex-wrap: wrap;">
    <img src="/as-seen-on2.png" alt="Media outlets" style="height: 35px;">
  </div>
</div>`,
      3: `<div style="font-family: sans-serif; padding: 25px; text-align: center; background: #0f172a; border-radius: 12px;">
  <p style="font-size: 14px; font-weight: 700; color: white; margin-bottom: 20px; letter-spacing: 2px;">FEATURED IN</p>
  <div style="display: flex; gap: 30px; justify-content: center; align-items: center; flex-wrap: wrap;">
    <img src="/as-seen-on3.png" alt="Media outlets" style="height: 32px;">
  </div>
</div>`,
      4: `<div style="font-family: sans-serif; padding: 25px; text-align: center; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
  <p style="font-size: 12px; color: #666; margin-bottom: 18px;">AS SEEN ON</p>
  <div style="display: flex; gap: 25px; justify-center; align-items: center; flex-wrap: wrap;">
    <img src="/as-seen-on4.png" alt="Media outlets" style="height: 28px;">
  </div>
</div>`
    };

    return `<!-- PR Trust Widget - Style ${selectedWidgetStyle} -->
<div class="pr-trust-widget" data-widget-id="${Date.now()}">
  ${styles[selectedWidgetStyle]}
</div>`;
  };

  const copyEmbedCode = () => {
    const code = getWidgetEmbedCode();
    navigator.clipboard.writeText(code);
    showToast('Embed code copied!');
  };

  // Prepare radar chart data
  const radarChartData = useMemo(() => {
    if (!competitorData) return [];
    
    const metrics = [
      { name: 'AI Citation', key: 'aiCitation' },
      { name: 'Media Authority', key: 'mediaAuthority' },
      { name: 'News Volume', key: 'newsVolume' },
      { name: 'Sentiment', key: 'sentimentPositivity' },
      { name: 'Topic Leadership', key: 'topicLeadership' }
    ];

    return metrics.map(metric => {
      const dataPoint: { metric: string; [key: string]: string | number } = {
        metric: metric.name,
        [companyName]: competitorData.userCompany.scores[metric.key]
      };

      competitorData.competitors.forEach((comp, idx) => {
        dataPoint[comp.name] = comp.scores[metric.key];
      });

      return dataPoint;
    });
  }, [competitorData, companyName]);

  const TabButton = ({ name, icon, label }) => (
    <button
      onClick={() => setActiveTab(name)}
      className={`flex items-center space-x-2 px-3 py-2 rounded-t-md border-b-2 transition-colors font-bold ${activeTab === name ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
    >
      {icon}<span className="hidden sm:inline">{label}</span>
    </button>
  );

  const menuItems = [
    { id: 'trending', label: 'Trending Topics', icon: TrendingUp },
    { id: 'competitor', label: 'Competitor Analysis', icon: BarChart3 },
    { id: 'generator', label: 'Press Release Generator', icon: FileText },
    { id: 'audit', label: 'Media Presence Audit', icon: Search },
  ];

  const analyzeTrending = async () => {
    if (!companyData) {
      alert('Please set up your company data first');
      return;
    }

    setIsLoadingTrending(true);
    setTrendingResults(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('trending-topics', {
        body: { 
          industry: companyData.industry,
          keywords: trendingKeywords,
          companyName: companyData.company_name
        }
      });

      if (error) throw error;
      setTrendingResults(data.analysis);
    } catch (e) {
      console.error('Error analyzing trends:', e);
      setTrendingResults('Error analyzing trending topics. Please try again.');
    }
    
    setIsLoadingTrending(false);
  };

  const analyzeCompetitors = async () => {
    if (!companyData) {
      alert('Please set up your company data first');
      return;
    }

    if (!competitorUrls.trim()) {
      alert('Please enter at least one competitor URL');
      return;
    }

    setIsLoadingCompetitor(true);
    setCompetitorResults(null);
    
    try {
      const urls = competitorUrls.split('\n').filter(url => url.trim());
      const { data, error } = await supabase.functions.invoke('competitor-analysis', {
        body: { 
          companyName: companyData.company_name,
          companyWebsite: companyData.website_url,
          industry: companyData.industry,
          competitorUrls: urls
        }
      });

      if (error) throw error;
      setCompetitorResults(data.analysis);
    } catch (e) {
      console.error('Error analyzing competitors:', e);
      setCompetitorResults('Error analyzing competitors. Please try again.');
    }
    
    setIsLoadingCompetitor(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <CompanyDataModal
        isOpen={isCompanyDataModalOpen}
        onClose={() => setIsCompanyDataModalOpen(false)}
        onSave={handleCompanyDataSave}
        currentData={companyData}
      />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-indigo-600">Media Blast Boosters</h1>
              <button
                onClick={() => setIsCompanyDataModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <Building2 className="h-4 w-4"/>
                Company Data
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6"/> : <Menu className="h-6 w-6"/>}
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex space-x-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      activeTab === item.id
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4"/>
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <nav className="lg:hidden py-4 border-t border-gray-200">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all mb-1 ${
                      activeTab === item.id
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-5 w-5"/>
                    {item.label}
                  </button>
                );
              })}
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'trending' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                <TrendingUp className="h-6 w-6 text-white"/>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Trending Topics Analyzer</h2>
                <p className="text-gray-600">Discover what's trending in your industry</p>
              </div>
            </div>

            {!companyData ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4"/>
                <p className="text-gray-600 mb-4">Please set up your company data first to use this feature.</p>
                <button
                  onClick={() => setIsCompanyDataModalOpen(true)}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-semibold"
                >
                  Set Up Company Data
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  <KeywordTagInput
                    value={trendingKeywords}
                    onChange={setTrendingKeywords}
                    placeholder="Add keywords to refine trending topics (optional)"
                    label="Keywords (Optional)"
                  />
                </div>

                <button
                  onClick={analyzeTrending}
                  disabled={isLoadingTrending}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-4 px-8 rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all"
                >
                  {isLoadingTrending ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin"/>
                      Analyzing Trends...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5"/>
                      Analyze Trending Topics
                    </>
                  )}
                </button>

                {trendingResults && (
                  <div className="mt-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-gray-900">Analysis Results</h3>
                      <button
                        onClick={() => copyToClipboard(trendingResults, 'trending')}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        {copiedStates.trending ? (
                          <>
                            <Check className="h-4 w-4 text-green-600"/>
                            <span className="text-sm font-medium text-green-600">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4"/>
                            <span className="text-sm font-medium">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="prose max-w-none bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-indigo-200">
                      <div className="whitespace-pre-wrap text-gray-800">{trendingResults}</div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'competitor' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                <BarChart3 className="h-6 w-6 text-white"/>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Competitor Analysis</h2>
                <p className="text-gray-600">Benchmark against your competition</p>
              </div>
            </div>

            {!companyData ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4"/>
                <p className="text-gray-600 mb-4">Please set up your company data first to use this feature.</p>
                <button
                  onClick={() => setIsCompanyDataModalOpen(true)}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-semibold"
                >
                  Set Up Company Data
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Competitor Websites
                    </label>
                    <textarea
                      value={competitorUrls}
                      onChange={(e) => setCompetitorUrls(e.target.value)}
                      placeholder="Enter competitor website URLs (one per line)&#10;https://competitor1.com&#10;https://competitor2.com"
                      className="w-full border border-gray-300 rounded-lg p-4 h-32 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>

                <button
                  onClick={analyzeCompetitors}
                  disabled={isLoadingCompetitor || !competitorUrls.trim()}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-4 px-8 rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all"
                >
                  {isLoadingCompetitor ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin"/>
                      Analyzing Competitors...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5"/>
                      Analyze Competitors
                    </>
                  )}
                </button>

                {competitorResults && (
                  <div className="mt-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-gray-900">Analysis Results</h3>
                      <button
                        onClick={() => copyToClipboard(competitorResults, 'competitor')}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        {copiedStates.competitor ? (
                          <>
                            <Check className="h-4 w-4 text-green-600"/>
                            <span className="text-sm font-medium text-green-600">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4"/>
                            <span className="text-sm font-medium">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="prose max-w-none bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200">
                      <div className="whitespace-pre-wrap text-gray-800">{competitorResults}</div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'benchmark' && (
          <div>
            <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Market Benchmarking</h3>
              <p className="text-sm text-gray-600">AI-powered competitive intelligence for {companyName}</p>
            </div>

            {!competitorData ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
                  <button
                    onClick={scanMarket}
                    disabled={isScanning}
                    className="relative bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 px-8 rounded-lg hover:from-indigo-700 hover:to-purple-700 shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-3"
                  >
                    {isScanning ? (
                      <>
                        <Loader className="h-6 w-6 animate-spin"/>
                        <span>Scanning Market...</span>
                      </>
                    ) : (
                      <>
                        <Search className="h-6 w-6"/>
                        <span>Scan Market</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-gray-500 mt-6 text-sm">Discover your top competitors and benchmark your PR performance</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Radar Chart */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-8 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                  <h3 className="text-2xl font-bold text-white mb-6">Competitive PR Performance</h3>
                  <ResponsiveContainer width="100%" height={500}>
                    <RadarChart data={radarChartData}>
                      <PolarGrid stroke="#475569" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: '#cbd5e1', fontSize: 14 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#94a3b8' }} />
                      <Radar 
                        name={companyName} 
                        dataKey={companyName} 
                        stroke="#60A5FA" 
                        fill="#60A5FA" 
                        fillOpacity={0.5}
                        strokeWidth={3}
                        animationDuration={1000}
                        animationEasing="ease-out"
                        isAnimationActive={true}
                      />
                      {competitorData.competitors.map((comp, idx) => (
                        <Radar
                          key={idx}
                          name={comp.name}
                          dataKey={comp.name}
                          stroke={['#94a3b8', '#64748b', '#475569'][idx]}
                          fill={['#94a3b8', '#64748b', '#475569'][idx]}
                          fillOpacity={0.2}
                          strokeWidth={1.5}
                          animationDuration={1000}
                          animationEasing="ease-out"
                          isAnimationActive={true}
                        />
                      ))}
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }} 
                        iconType="circle"
                        onMouseEnter={(e) => {
                          // Could add hover highlight logic here if needed
                        }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1e293b', 
                          border: '1px solid #475569',
                          borderRadius: '8px',
                          color: '#e2e8f0',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                        }}
                        itemStyle={{ color: '#e2e8f0' }}
                        cursor={{ stroke: '#60A5FA', strokeWidth: 1, fill: 'rgba(96, 165, 250, 0.1)' }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Competitor Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {competitorData.competitors.map((comp, idx) => (
                    <div key={idx} className="bg-white/10 backdrop-blur-md rounded-lg p-5 border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-gray-900">{comp.name}</h4>
                        {comp.trend === 'up' ? (
                          <TrendingUp className="h-5 w-5 text-green-500"/>
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-500"/>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{comp.gapAnalysis}</p>
                      <div className="text-xs text-gray-500">
                        PR Trend: {comp.trend === 'up' ? 'Increasing' : 'Decreasing'}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Competitive Intelligence */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border-2 border-indigo-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-indigo-600"/>
                    Competitive Intelligence
                  </h3>
                  <ul className="space-y-3">
                    {competitorData.competitiveIntelligence.map((insight, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <span className="text-gray-700">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={scanMarket}
                  disabled={isScanning}
                  className="w-full bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg hover:bg-gray-300 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isScanning ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin"/>
                      <span>Rescanning...</span>
                    </>
                  ) : (
                    <>
                      <Search className="h-5 w-5"/>
                      <span>Rescan Market</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'widgets' && (
          <div>
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Brand Trust Assets</h3>
              <p className="text-sm text-gray-600">Professional "As Seen On" widgets for your website</p>
            </div>

            {/* Widget Style Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {[1, 2, 3, 4].map((styleNum) => {
                const styleNames = {
                  1: 'The Minimalist',
                  2: 'The Editorial', 
                  3: 'The Tech Glow',
                  4: 'The Classic Wire'
                };
                
                return (
                  <div 
                    key={styleNum}
                    onClick={() => setSelectedWidgetStyle(styleNum)}
                    className={`bg-white border-2 rounded-lg p-6 cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${selectedWidgetStyle === styleNum ? 'border-indigo-500 shadow-lg' : 'border-gray-200'}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-gray-900">{styleNames[styleNum]}</h4>
                      {selectedWidgetStyle === styleNum && (
                        <CheckCircle className="h-5 w-5 text-indigo-600"/>
                      )}
                    </div>
                    
                    {/* Widget Preview */}
                    <div className="mb-4 overflow-hidden rounded border bg-gray-50 p-4">
                      {styleNum === 1 && (
                        <div style={{ fontFamily: 'sans-serif', textAlign: 'center' }}>
                          <p style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>AS SEEN ON</p>
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <img src="/as-seen-on1.png" alt="Media outlets" style={{ height: '30px', maxWidth: '100%' }} />
                          </div>
                        </div>
                      )}
                      {styleNum === 2 && (
                        <div style={{ fontFamily: 'Georgia, serif', textAlign: 'center', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', borderRadius: '10px', padding: '20px' }}>
                          <h3 style={{ fontSize: '18px', color: '#333', marginBottom: '20px' }}>Featured In</h3>
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <img src="/as-seen-on2.png" alt="Media outlets" style={{ height: '35px', maxWidth: '100%' }} />
                          </div>
                        </div>
                      )}
                      {styleNum === 3 && (
                        <div style={{ fontFamily: 'sans-serif', textAlign: 'center', background: '#0f172a', borderRadius: '12px', padding: '20px' }}>
                          <p style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginBottom: '20px', letterSpacing: '2px' }}>FEATURED IN</p>
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <img src="/as-seen-on3.png" alt="Media outlets" style={{ height: '32px', maxWidth: '100%', filter: 'brightness(0) invert(1)' }} />
                          </div>
                        </div>
                      )}
                      {styleNum === 4 && (
                        <div style={{ fontFamily: 'sans-serif', textAlign: 'center', background: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', padding: '20px' }}>
                          <p style={{ fontSize: '12px', color: '#666', marginBottom: '18px' }}>AS SEEN ON</p>
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <img src="/as-seen-on4.png" alt="Media outlets" style={{ height: '28px', maxWidth: '100%' }} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Resolution Toggle */}
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setWidgetResolution('starter');
                        }}
                        className={`flex-1 text-sm py-2 px-3 rounded transition-all ${widgetResolution === 'starter' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        Starter (3 logos)
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isPremiumUnlocked) {
                            setWidgetResolution('premium');
                          }
                        }}
                        disabled={!isPremiumUnlocked}
                        className={`flex-1 text-sm py-2 px-3 rounded transition-all ${widgetResolution === 'premium' && isPremiumUnlocked ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} ${!isPremiumUnlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {!isPremiumUnlocked && <Lock className="h-3 w-3 inline mr-1"/>}
                        Premium (6+ logos)
                      </button>
                    </div>
                    
                    {!isPremiumUnlocked && widgetResolution === 'premium' && (
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        🔒 Unlock with Standard/Premium PR Order
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Embed Code Section */}
            <div className="bg-gray-900 rounded-lg p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Embed Code</h3>
                <button
                  onClick={copyEmbedCode}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center gap-2 transition-all"
                >
                  <Copy className="h-4 w-4"/>
                  Copy Code
                </button>
              </div>
              <div className="relative">
                <pre className="bg-gray-800 text-green-400 p-4 rounded overflow-x-auto text-xs max-h-96 overflow-y-auto">
                  <code>{getWidgetEmbedCode()}</code>
                </pre>
              </div>
            </div>

            {/* Widget Health Check */}
            <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-indigo-600"/>
                Widget Health Check
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Verify that your widget is live on your website
              </p>
              
              <div className="flex gap-3 mb-4">
                <input
                  type="url"
                  value={verifyUrl}
                  onChange={(e) => setVerifyUrl(e.target.value)}
                  placeholder="https://yourwebsite.com"
                  className="flex-1 border border-gray-300 p-3 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  onClick={verifyWidgetPlacement}
                  disabled={isVerifying || !verifyUrl.trim()}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                >
                  {isVerifying ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin"/>
                      Checking...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4"/>
                      Verify
                    </>
                  )}
                </button>
              </div>

              {verificationStatus && (
                <div className={`p-4 rounded-lg ${verificationStatus.found ? 'bg-green-50 border border-green-200' : verificationStatus.blocked ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'}`}>
                  {verificationStatus.found ? (
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="h-5 w-5"/>
                      <span className="font-semibold">Widget Live & Verified! ✓</span>
                    </div>
                  ) : verificationStatus.blocked ? (
                    <div>
                      <div className="flex items-center gap-2 text-yellow-800 mb-2">
                        <AlertTriangle className="h-5 w-5"/>
                        <span className="font-semibold">Verification Blocked</span>
                      </div>
                      <p className="text-sm text-yellow-700 mb-3">
                        Unable to verify automatically. You can manually confirm the widget is placed.
                      </p>
                      <button
                        onClick={() => {
                          setVerificationStatus({ ...verificationStatus, manuallyConfirmed: true });
                          showToast('Manually confirmed');
                        }}
                        className="bg-yellow-600 text-white px-4 py-2 rounded text-sm hover:bg-yellow-700 transition-all"
                      >
                        Manually Confirm Placement
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-800">
                      <X className="h-5 w-5"/>
                      <span className="font-semibold">Widget Not Found</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'pr' && (
          <div>
            {showGeneratedView && generatedPR ? (
              <div className="space-y-6">
                <div className="p-6 bg-white border-2 border-indigo-200 rounded-lg shadow-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-gray-900">Generated Press Release</h3>
                    <button 
                      onClick={() => setShowGeneratedView(false)}
                      className="text-gray-700 hover:text-gray-900 flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <CornerUpLeft className="h-4 w-4"/>
                      Go back to Edit
                    </button>
                  </div>
                  <div 
                    className="prose prose-sm max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: generatedPR }}
                  />
                  <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                    <button 
                      onClick={() => {
                        const textContent = generatedPR.replace(/<[^>]*>/g, '');
                        navigator.clipboard.writeText(textContent);
                        showToast('Copied to clipboard!');
                      }}
                      className="text-indigo-600 hover:text-indigo-700 flex items-center gap-2 px-4 py-2 border border-indigo-300 rounded-lg hover:bg-indigo-50"
                    >
                      <Clipboard className="h-4 w-4"/>
                      Copy
                    </button>
                    <button 
                      onClick={() => setShowRefineDialog(true)}
                      disabled={refinementCount >= 5}
                      className="bg-indigo-600 text-white flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      <Sparkles className="h-4 w-4"/>
                      Refine with AI {refinementCount > 0 && `(${refinementCount}/5)`}
                    </button>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-2 border-indigo-200 rounded-xl p-8 shadow-xl">
                  <div className="flex flex-col lg:flex-row gap-8 items-center">
                    <div className="flex-1">
                      <h3 className="text-3xl font-bold text-gray-900 mb-2">Ready to Launch Your PR?</h3>
                      <p className="text-lg text-gray-700 mb-4">Get your press release published across hundreds of top news outlets and reach millions of readers every month!</p>
                     <ul className="space-y-2 mb-4">
                        <li className="flex items-center text-gray-700">
                          <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0"/>
                          Get Massive Social Proof
                        </li>
                        <li className="flex items-center text-gray-700">
                          <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0"/>
                          Attract Potential Customers
                        </li>
                        <li className="flex items-center text-gray-700">
                          <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0"/>
                          Achieve Top Ranks on Google
                        </li>
                        <li className="flex items-center text-gray-700">
                          <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0"/>
                          Increase your Credibility
                        </li>
                        <li className="flex items-center text-gray-700">
                          <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0"/>
                          Get Valuable SEO Backlinks
                        </li>
                      </ul>
                      <a 
                        href="https://xtremewebsites.com/press-release-marketing/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-1"
                      >
                        Learn More <ExternalLink className="h-4 w-4"/>
                      </a>
                    </div>
                    
                    <div className="flex-shrink-0 bg-white rounded-xl p-6 shadow-lg border-2 border-indigo-300">
                      {prFormData.wordCount === '350' ? (
                        <div className="space-y-3">
                          <div className="text-sm font-semibold text-indigo-600 uppercase tracking-wide">Starter</div>
                          <div className="text-4xl font-bold text-gray-900">$2.49<span className="text-lg text-gray-600">/outlet</span></div>
                          <div className="space-y-2 text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500"/>
                              <span>Good Exposure & SEO Boost</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500"/>
                              <span className="font-semibold">200 News Outlets</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500"/>
                              <span>350 Words Article</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500"/>
                              <span>2.2M Monthly Readers</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500"/>
                              <span>69 Max Authority</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleCheckout('price_1SVMlPF7VMmZPCV7wEhuva5m', 'Basic PR Package')}
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:from-indigo-700 hover:to-purple-700 shadow-lg transform hover:scale-105 transition-all disabled:opacity-50"
                          >
                            🚀 Order & Launch PR
                          </button>
                        </div>
                      ) : prFormData.wordCount === '500' ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold text-indigo-600 uppercase tracking-wide">Standard</div>
                            <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded">POPULAR</span>
                          </div>
                          <div className="text-4xl font-bold text-gray-900">$2.49<span className="text-lg text-gray-600">/outlet</span></div>
                          <div className="space-y-2 text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500"/>
                              <span>Expanded Reach & SEO Boost</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500"/>
                              <span className="font-semibold">300 News Outlets</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500"/>
                              <span>500 Words Article</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500"/>
                              <span>26.4M Monthly Readers</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500"/>
                              <span>88 Max Authority</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleCheckout('price_1SVMldF7VMmZPCV7qTmVeIef', 'Standard PR Package')}
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:from-indigo-700 hover:to-purple-700 shadow-lg transform hover:scale-105 transition-all disabled:opacity-50"
                          >
                            🚀 Order & Launch PR
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="text-sm font-semibold text-indigo-600 uppercase tracking-wide">Premium</div>
                          <div className="text-4xl font-bold text-gray-900">$2.21<span className="text-lg text-gray-600">/outlet</span></div>
                          <div className="space-y-2 text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500"/>
                              <span>Ultimate Reach & SEO Boost</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500"/>
                              <span className="font-semibold">450 News Outlets</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500"/>
                              <span>1000 Words Article</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500"/>
                              <span>224.5M Monthly Readers</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500"/>
                              <span>94 Max Authority</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleCheckout('price_1SVMlrF7VMmZPCV7iZw0nWTG', 'Premium PR Package')}
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:from-indigo-700 hover:to-purple-700 shadow-lg transform hover:scale-105 transition-all disabled:opacity-50"
                          >
                            🚀 Order & Launch PR
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6 p-4 bg-gray-100 rounded-lg border">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Create Your Press Release</h3>
                  <p className="text-sm text-gray-600">Fill in the details below.</p>
                </div>

                <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trending Topic Reference</label>
                {selectedTopic ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-semibold text-blue-900 text-sm">{selectedTopic.title}</p>
                        <p className="text-xs text-blue-600 mt-1">Source: {selectedTopic.source}</p>
                        {selectedTopic.selectedIdea && (
                          <p className="text-xs text-blue-700 mt-2 bg-blue-100 p-2 rounded">
                            <strong>Selected Angle:</strong> {selectedTopic.selectedIdea}
                          </p>
                        )}
                      </div>
                      <button onClick={() => setSelectedTopic(null)} className="text-blue-600 hover:text-blue-800 text-xs font-medium ml-3">Clear</button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-500">No topic selected. Choose from Trending Topics or write freely.</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                  <input 
                    type="text" 
                    value={companyName} 
                    disabled 
                    className="w-full border border-gray-300 bg-gray-50 p-3 rounded-md text-gray-600"
                  />
                  <p className="text-xs text-gray-500 mt-1">Set in sidebar settings</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quote Attribution</label>
                  <input 
                    type="text" 
                    value={quoteAttribution} 
                    disabled 
                    className="w-full border border-gray-300 bg-gray-50 p-3 rounded-md text-gray-600"
                  />
                  <p className="text-xs text-gray-500 mt-1">Set in sidebar settings</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">What is the main focus of your content?</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowFocusDropdown(!showFocusDropdown);
                        setShowThemeDropdown(false);
                      }}
                      className="w-full border border-gray-300 p-3 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-left flex items-center justify-between"
                    >
                        <div className="flex items-center gap-2">
                        {prFormData.mainFocus === 'Company News' && <span>📢</span>}
                        {prFormData.mainFocus === 'How-to Guide' && <span>📚</span>}
                        {prFormData.mainFocus === 'Thought Leadership' && <span>💡</span>}
                        {prFormData.mainFocus === 'Opinion/Editorial' && <span>✍️</span>}
                        {prFormData.mainFocus === 'Best Practices' && <span>⭐</span>}
                        {prFormData.mainFocus === 'Case Study' && <span>📋</span>}
                        <span className="font-semibold text-gray-900">{prFormData.mainFocus}</span>
                      </div>
                      <svg className={`h-5 w-5 text-gray-400 transition-transform ${showFocusDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {showFocusDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setPrFormData({...prFormData, mainFocus: 'Company News'});
                          setShowFocusDropdown(false);
                        }}
                        className={`w-full text-left p-3 hover:bg-indigo-50 border-b transition-colors ${prFormData.mainFocus === 'Company News' ? 'bg-indigo-50' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl">📢</span>
                          <div>
                            <p className="font-bold text-gray-900 mb-0.5">Company News</p>
                            <p className="text-sm text-gray-600">Announcements, partnerships, and updates</p>
                          </div>
                        </div>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setPrFormData({...prFormData, mainFocus: 'How-to Guide'});
                          setShowFocusDropdown(false);
                        }}
                        className={`w-full text-left p-3 hover:bg-indigo-50 border-b transition-colors ${prFormData.mainFocus === 'How-to Guide' ? 'bg-indigo-50' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl">📚</span>
                          <div>
                            <p className="font-bold text-gray-900 mb-0.5">How-to Guide</p>
                            <p className="text-sm text-gray-600">Step-by-step tutorial or instructional content</p>
                          </div>
                        </div>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setPrFormData({...prFormData, mainFocus: 'Thought Leadership'});
                          setShowFocusDropdown(false);
                        }}
                        className={`w-full text-left p-3 hover:bg-indigo-50 border-b transition-colors ${prFormData.mainFocus === 'Thought Leadership' ? 'bg-indigo-50' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl">💡</span>
                          <div>
                            <p className="font-bold text-gray-900 mb-0.5">Thought Leadership</p>
                            <p className="text-sm text-gray-600">Share expertise and forward-thinking perspectives</p>
                          </div>
                        </div>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setPrFormData({...prFormData, mainFocus: 'Opinion/Editorial'});
                          setShowFocusDropdown(false);
                        }}
                        className={`w-full text-left p-3 hover:bg-indigo-50 border-b transition-colors ${prFormData.mainFocus === 'Opinion/Editorial' ? 'bg-indigo-50' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl">✍️</span>
                          <div>
                            <p className="font-bold text-gray-900 mb-0.5">Opinion/Editorial</p>
                            <p className="text-sm text-gray-600">Express viewpoint or commentary on current topics</p>
                          </div>
                        </div>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setPrFormData({...prFormData, mainFocus: 'Best Practices'});
                          setShowFocusDropdown(false);
                        }}
                        className={`w-full text-left p-3 hover:bg-indigo-50 border-b transition-colors ${prFormData.mainFocus === 'Best Practices' ? 'bg-indigo-50' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl">⭐</span>
                          <div>
                            <p className="font-bold text-gray-900 mb-0.5">Best Practices</p>
                            <p className="text-sm text-gray-600">Outline proven strategies and recommended approaches</p>
                          </div>
                        </div>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setPrFormData({...prFormData, mainFocus: 'Case Study'});
                          setShowFocusDropdown(false);
                        }}
                        className={`w-full text-left p-3 hover:bg-indigo-50 transition-colors ${prFormData.mainFocus === 'Case Study' ? 'bg-indigo-50' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl">📋</span>
                          <div>
                            <p className="font-bold text-gray-900 mb-0.5">Case Study</p>
                            <p className="text-sm text-gray-600">Present real-world examples and lessons learned</p>
                          </div>
                        </div>
                      </button>
                    </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Theme and Style</label>
                  <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowThemeDropdown(!showThemeDropdown);
                      setShowFocusDropdown(false);
                    }}
                    className="w-full border border-gray-300 p-3 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-left flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {prFormData.theme === 'thought-provoking' && <span>💭</span>}
                      {prFormData.theme === 'investigative' && <span>🔎</span>}
                      {prFormData.theme === 'breaking-news' && <span>📰</span>}
                      {prFormData.theme === 'scientific' && <span>📊</span>}
                      <span className="font-semibold text-gray-900">
                        {prFormData.theme === 'thought-provoking' && 'Thought-Provoking'}
                        {prFormData.theme === 'investigative' && 'Investigative'}
                        {prFormData.theme === 'breaking-news' && 'Breaking News'}
                        {prFormData.theme === 'scientific' && 'Scientific'}
                      </span>
                    </div>
                    <svg className={`h-5 w-5 text-gray-400 transition-transform ${showThemeDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showThemeDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setPrFormData({...prFormData, theme: 'thought-provoking'});
                          setShowThemeDropdown(false);
                        }}
                        className={`w-full text-left p-3 hover:bg-indigo-50 border-b transition-colors ${prFormData.theme === 'thought-provoking' ? 'bg-indigo-50' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl">💭</span>
                          <div>
                            <p className="font-bold text-gray-900 mb-0.5">Thought-Provoking</p>
                            <p className="text-sm text-gray-600">Challenging, intellectual, encourages deep reflection</p>
                          </div>
                        </div>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setPrFormData({...prFormData, theme: 'investigative'});
                          setShowThemeDropdown(false);
                        }}
                        className={`w-full text-left p-3 hover:bg-indigo-50 border-b transition-colors ${prFormData.theme === 'investigative' ? 'bg-indigo-50' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl">🔎</span>
                          <div>
                            <p className="font-bold text-gray-900 mb-0.5">Investigative</p>
                            <p className="text-sm text-gray-600">In-depth, fact-finding, exposing hidden truths</p>
                          </div>
                        </div>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setPrFormData({...prFormData, theme: 'breaking-news'});
                          setShowThemeDropdown(false);
                        }}
                        className={`w-full text-left p-3 hover:bg-indigo-50 border-b transition-colors ${prFormData.theme === 'breaking-news' ? 'bg-indigo-50' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl">📰</span>
                          <div>
                            <p className="font-bold text-gray-900 mb-0.5">Breaking News</p>
                            <p className="text-sm text-gray-600">Urgent, immediate, focused on latest developments</p>
                          </div>
                        </div>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setPrFormData({...prFormData, theme: 'scientific'});
                          setShowThemeDropdown(false);
                        }}
                        className={`w-full text-left p-3 hover:bg-indigo-50 transition-colors ${prFormData.theme === 'scientific' ? 'bg-indigo-50' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl">📊</span>
                          <div>
                            <p className="font-bold text-gray-900 mb-0.5">Scientific</p>
                            <p className="text-sm text-gray-600">Data-driven, analytical, objective</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Article-Length Goal</label>
                <select
                  value={prFormData.wordCount}
                  onChange={(e) => setPrFormData({...prFormData, wordCount: e.target.value})}
                  className="w-full border border-gray-300 p-3 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="350">Brief Insight: 350 Words Article</option>
                  <option value="500">Standard Article: 500 Words Article</option>
                  <option value="1000">In-Depth Exploration: 1000 Words Article</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Keywords to Target (up to 2)</label>
                <KeywordTagInput 
                  keywords={prFormData.keywords}
                  onChange={(keywords) => setPrFormData({...prFormData, keywords})}
                  maxKeywords={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">What is the Press Release About?</label>
                <textarea
                  value={prFormData.about}
                  onChange={(e) => setPrFormData({...prFormData, about: e.target.value})}
                  placeholder="Describe the news, announcement, or story..."
                  className="w-full border border-gray-300 p-3 rounded-md h-[250px] focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Important Quote</label>
                <textarea
                  value={prFormData.quote}
                  onChange={(e) => setPrFormData({...prFormData, quote: e.target.value})}
                  placeholder="Enter a compelling quote..."
                  className="w-full border border-gray-300 p-3 rounded-md h-24 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="border-t pt-6 mt-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Optional Data</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Featured Image</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setPrFormData({...prFormData, featuredImage: file});
                            showToast('Image added');
                          }
                        }}
                        className="w-full border border-gray-300 p-2 rounded-md text-sm"
                      />
                      {prFormData.featuredImage && (
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0"/>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">YouTube Video URL</label>
                    <input
                      type="url"
                      value={prFormData.videoUrl}
                      onChange={(e) => setPrFormData({...prFormData, videoUrl: e.target.value})}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full border border-gray-300 p-3 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Google Maps Embed</label>
                  <textarea
                    value={prFormData.mapsEmbed}
                    onChange={(e) => setPrFormData({...prFormData, mapsEmbed: e.target.value})}
                    placeholder="Paste your Google Maps embed code here..."
                    className="w-full border border-gray-300 p-3 rounded-md h-24 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="border-t pt-6 flex gap-3">
                <button onClick={generatePressRelease} disabled={isLoading} className="flex-1 bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2">
                  {isLoading ? <Loader className="h-5 w-5 mr-2 animate-spin"/> : <Sparkles className="h-5 w-5 mr-2"/>}
                  Generate Press Release
                </button>
                <button onClick={clearForm} className="bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg hover:bg-gray-300">
                  Clear Form
                </button>
              </div>

                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          orders.length > 0 ? (
          <div className="space-y-6">
            {showThankYou && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <h3 className="text-2xl font-bold text-green-800 mb-2">🎉 Thank You for Your Order!</h3>
                <p className="text-green-700">Your press release has been successfully submitted for distribution.</p>
              </div>
            )}
            
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PR Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price Paid</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 text-sm text-gray-900">{order.prTitle}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{order.productName}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-green-600">{order.price}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{order.date}</td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="text-indigo-600 hover:text-indigo-900 font-medium flex items-center gap-1"
                        >
                          <ExternalLink className="h-4 w-4"/>
                          View PR
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-20">
            <ShoppingCart className="h-16 w-16 mx-auto text-gray-300 mb-4"/>
            <p>Your orders will appear here.</p>
          </div>
        ))}
      </main>

      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Settings</h2>
            
            <div className="space-y-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input 
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quote Attribution</label>
                  <input 
                    value={quoteAttribution}
                    onChange={(e) => setQuoteAttribution(e.target.value)}
                    placeholder="e.g., John Doe - CEO, Company Name"
                    className="w-full border border-gray-300 p-2 rounded-md"
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-500" />
                  PR Generator Prompt
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Customize the AI prompt used to generate press releases. Use placeholders like {'{companyName}'}, {'{industry}'}, {'{websiteUrl}'}, {'{mainFocus}'}, {'{theme}'}, {'{targetWords}'}, {'{keywordsText}'}, {'{about}'}, {'{quote}'}, and {'{quoteAttribution}'}.
                </p>
                <textarea 
                  value={prPrompt}
                  onChange={(e) => setPrPrompt(e.target.value)}
                  className="w-full border border-gray-300 p-3 rounded-md font-mono text-sm h-96"
                  placeholder="Enter your custom prompt template..."
                />
                <button
                  onClick={() => {
                    setPrPrompt(`Write a professional press release for {companyName} in the {industry} industry.

Requirements:
- Word count: EXACTLY {targetWords} words (this is critical)
- Main focus: {mainFocus}
- Writing style: {theme}
- Target keywords: {keywordsText}
- Website: {websiteUrl}

Content details:
{about}

Include this quote:
"{quote}"
- {quoteAttribution}

Format the press release with HTML tags for proper formatting:
1. Use <h1> for the main headline
2. Use <h2> for section headers (About Company, Contact Information)
3. Use <strong> for emphasis on important points
4. Use <em> for quotes
5. Use <a href="{websiteUrl}" target="_blank"> for links
6. Use <p> for paragraphs

Structure:
1. <h1>Compelling headline</h1>
2. <p><strong>FOR IMMEDIATE RELEASE</strong></p>
3. <p><strong>Dateline</strong> [City, State - Date]</p>
4. Strong opening paragraph with key news
5. 2-3 body paragraphs expanding on the news
6. <p><em>"{quote}"</em> said <strong>{quoteAttribution}</strong>.</p>
7. <h2>About {companyName}</h2>
   <p>Write a compelling company description based on the website {websiteUrl} and industry {industry}. Include what makes them unique and their mission.</p>
8. <h2>Contact Information</h2>
   <p>For press inquiries, please visit <a href="{websiteUrl}" target="_blank">{websiteUrl}</a></p>

Make it newsworthy, SEO-optimized with the keywords, and maintain the {theme} tone throughout.

IMPORTANT: 
- The press release must be EXACTLY {targetWords} words
- Use proper HTML formatting throughout
- Ensure all HTML tags are properly closed`);
                    showToast('Prompt reset to default');
                  }}
                  className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Reset to Default
                </button>
              </div>
            </div>
            
            <button 
              onClick={() => {
                setShowSettings(false);
                showToast('Settings saved!');
              }}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
            >
              Save Instructions
            </button>
          </div>
        </div>
      )}

      {showRefineDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h2 className="text-2xl font-bold mb-4">Refine Press Release with AI</h2>
            <p className="text-sm text-gray-600 mb-4">
              Provide instructions on how you'd like to refine the press release. 
              {refinementCount > 0 && ` (${refinementCount}/5 refinements used)`}
            </p>
            
            <textarea
              value={refinementInstructions}
              onChange={(e) => setRefinementInstructions(e.target.value)}
              placeholder="E.g., Make it more professional, add more statistics, emphasize the benefits..."
              className="w-full border border-gray-300 p-3 rounded-md h-32 mb-4 focus:ring-indigo-500 focus:border-indigo-500"
            />
            
            <div className="flex gap-3">
              <button 
                onClick={refinePressRelease}
                disabled={isLoading || !refinementInstructions.trim()}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin"/>
                    Refining...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4"/>
                    Refine
                  </>
                )}
              </button>
              <button 
                onClick={() => {
                  setShowRefineDialog(false);
                  setRefinementInstructions('');
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{selectedOrder.prTitle}</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6"/>
              </button>
            </div>
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: selectedOrder.prContent }} />
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg z-50 ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}