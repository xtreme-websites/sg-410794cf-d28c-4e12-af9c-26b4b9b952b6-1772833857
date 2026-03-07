import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle, CheckCircle2, TrendingUp, Target, Users, Calendar, DollarSign, BarChart3, Settings, Sparkles, RefreshCw, Info, Download, Copy, ExternalLink, Eye, EyeOff, Globe, Building2, Mail, Phone, MapPin, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import KeywordTagInput from "./KeywordTagInput";
import CompanyDataModal from "./CompanyDataModal";

// Types
interface CompanyData {
  name: string;
  industry: string;
  website: string;
  description: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  founded_year: string;
}

interface CompetitorData {
  name: string;
  strengths: string[];
  weaknesses: string[];
  market_share: number;
}

interface AnalysisResult {
  market_position: string;
  competitive_advantages: string[];
  recommendations: string[];
  overall_score: number;
}

interface CompetitorAnalysis {
  id: string;
  created_at: string;
  company_name: string;
  industry: string;
  competitors: CompetitorData[];
  analysis: AnalysisResult;
}

interface TrendingTopic {
  topic: string;
  relevance_score: number;
  why_relevant: string;
  potential_angles: string[];
}

interface MediaPresence {
  platform: string;
  presence_score: number;
  findings: string[];
  recommendations: string[];
}

// API Configuration
const CLAUDE_API_KEY_STORAGE = 'claude_api_key';

const callClaude = async (systemPrompt: string, userPrompt: string, apiKey?: string): Promise<string> => {
  const key = apiKey || localStorage.getItem(CLAUDE_API_KEY_STORAGE);
  
  if (!key) {
    throw new Error('Claude API key not configured. Please add your API key in Settings.');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8096,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: userPrompt
      }]
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Claude API request failed');
  }

  const data = await response.json();
  return data.content[0].text;
};

const callGemini = async (prompt: string): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );

  if (!response.ok) {
    throw new Error('Gemini API request failed');
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
};

// Helper functions for AI calls
const ai = (systemPrompt: string, userPrompt: string, apiKey?: string) => 
  callClaude(systemPrompt, userPrompt, apiKey);

const aiW = (prompt: string) => callGemini(prompt);

const PRDashboard = () => {
  // State management
  const [activeTab, setActiveTab] = useState("generate");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  
  // Company data state
  const [companyData, setCompanyData] = useState<CompanyData>({
    name: "",
    industry: "",
    website: "",
    description: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    founded_year: ""
  });
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);

  // PR Generation state
  const [prTitle, prSetTitle] = useState("");
  const [prProductName, prSetProductName] = useState("");
  const [prKeyFeatures, prSetKeyFeatures] = useState<string[]>([]);
  const [prTargetAudience, prSetTargetAudience] = useState("");
  const [prLaunchDate, prSetLaunchDate] = useState("");
  const [prQuote, prSetQuote] = useState("");
  const [prAdditionalInfo, prSetAdditionalInfo] = useState("");
  const [prPackage, prSetPackage] = useState<"starter" | "standard" | "premium">("standard");
  const [generatedPR, setGeneratedPR] = useState("");
  
  // Refinement state
  const [originalPR, setOriginalPR] = useState("");
  const [refinementInstructions, setRefinementInstructions] = useState("");
  const [refinedPR, setRefinedPR] = useState("");
  
  // Competitor Analysis state
  const [analysisCompany, setAnalysisCompany] = useState("");
  const [analysisIndustry, setAnalysisIndustry] = useState("");
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [analysisResults, setAnalysisResults] = useState<CompetitorAnalysis | null>(null);
  const [savedAnalyses, setSavedAnalyses] = useState<CompetitorAnalysis[]>([]);
  
  // Trending Topics state
  const [topicsIndustry, setTopicsIndustry] = useState("");
  const [topicsKeywords, setTopicsKeywords] = useState<string[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  
  // Media Audit state
  const [auditCompany, setAuditCompany] = useState("");
  const [auditWebsite, setAuditWebsite] = useState("");
  const [mediaPresence, setMediaPresence] = useState<MediaPresence[]>([]);
  
  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [claudeApiKey, setClaudeApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  // Load saved data
  useEffect(() => {
    loadSavedAnalyses();
    loadClaudeApiKey();
  }, []);

  const loadClaudeApiKey = () => {
    const savedKey = localStorage.getItem(CLAUDE_API_KEY_STORAGE);
    if (savedKey) {
      setClaudeApiKey(savedKey);
    }
  };

  const saveClaudeApiKey = () => {
    if (claudeApiKey.trim()) {
      localStorage.setItem(CLAUDE_API_KEY_STORAGE, claudeApiKey.trim());
      toast.success("API key saved successfully");
      setShowSettings(false);
    } else {
      toast.error("Please enter a valid API key");
    }
  };

  const loadSavedAnalyses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("competitor_analysis")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setSavedAnalyses(data);
    } catch (err) {
      console.error("Error loading analyses:", err);
    }
  };

  const simulateProgress = (duration: number) => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return prev;
        }
        return prev + 5;
      });
    }, duration / 20);
    return interval;
  };

  // PR Generation
  const handleGeneratePR = async () => {
    if (!companyData.name || !prProductName || prKeyFeatures.length === 0) {
      toast.error("Please fill in all required fields and set up company data");
      return;
    }

    setLoading(true);
    setError(null);
    const progressInterval = simulateProgress(15000);

    try {
      const systemPrompt = `You are an expert PR writer specializing in product launches and company announcements. 
Create compelling, newsworthy press releases that follow AP style guidelines and industry best practices.
Focus on creating attention-grabbing headlines and engaging content that journalists will want to cover.`;

      const userPrompt = `Create a ${prPackage} package press release for:

Company: ${companyData.name}
Industry: ${companyData.industry}
Website: ${companyData.website}
Description: ${companyData.description}

Product/Announcement: ${prProductName}
Title/Angle: ${prTitle}
Key Features: ${prKeyFeatures.join(", ")}
Target Audience: ${prTargetAudience}
Launch Date: ${prLaunchDate}
${prQuote ? `Quote: "${prQuote}"` : ""}
${prAdditionalInfo ? `Additional Context: ${prAdditionalInfo}` : ""}

Package Level Guidelines:
${prPackage === "starter" ? "- Length: 300-400 words\n- Focus on core message and key features\n- Include one quote" : ""}
${prPackage === "standard" ? "- Length: 500-600 words\n- Include market context and benefits\n- Include 2-3 quotes from different perspectives\n- Add brief company background" : ""}
${prPackage === "premium" ? "- Length: 700-800 words\n- Comprehensive market analysis\n- Multiple quotes from executives and industry experts\n- Detailed company background\n- Market statistics and trends\n- Call-to-action and media contact information" : ""}

Format the press release professionally with:
- Compelling headline
- Location and date dateline
- Strong opening paragraph (who, what, when, where, why)
- Supporting paragraphs with key details
- Quotes from company spokesperson
- Company boilerplate
- Media contact information`;

      const result = await ai(systemPrompt, userPrompt);
      setGeneratedPR(result);
      setProgress(100);
      toast.success("Press release generated successfully!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate press release";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
      setProgress(0);
    }
  };

  // PR Refinement
  const handleRefinePR = async () => {
    if (!originalPR || !refinementInstructions) {
      toast.error("Please provide both the original PR and refinement instructions");
      return;
    }

    setLoading(true);
    setError(null);
    const progressInterval = simulateProgress(10000);

    try {
      const systemPrompt = `You are an expert PR editor. Your job is to refine and improve press releases based on specific feedback and instructions.
Maintain the core message while implementing the requested changes.
Ensure the refined version follows AP style and PR best practices.`;

      const userPrompt = `Original Press Release:
${originalPR}

Refinement Instructions:
${refinementInstructions}

Please refine the press release according to these instructions while maintaining professional quality and newsworthiness.`;

      const result = await ai(systemPrompt, userPrompt);
      setRefinedPR(result);
      setProgress(100);
      toast.success("Press release refined successfully!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to refine press release";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
      setProgress(0);
    }
  };

  // Competitor Analysis
  const handleCompetitorAnalysis = async () => {
    if (!analysisCompany || !analysisIndustry || competitors.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError(null);
    const progressInterval = simulateProgress(20000);

    try {
      const systemPrompt = `You are a business analyst specializing in competitive intelligence and market positioning.
Provide detailed, actionable insights about companies and their competitive landscape.
Focus on strategic advantages, market opportunities, and concrete recommendations.`;

      const userPrompt = `Analyze the competitive landscape for:

Company: ${analysisCompany}
Industry: ${analysisIndustry}
Key Competitors: ${competitors.join(", ")}

Provide a comprehensive analysis including:
1. Market position assessment
2. Competitive advantages and differentiators
3. Strategic recommendations
4. Overall market score (0-100)

For each competitor, analyze:
- Key strengths
- Potential weaknesses
- Estimated market share

Return the analysis in JSON format:
{
  "market_position": "detailed description",
  "competitive_advantages": ["advantage1", "advantage2", ...],
  "recommendations": ["recommendation1", "recommendation2", ...],
  "overall_score": 85,
  "competitors": [
    {
      "name": "Competitor Name",
      "strengths": ["strength1", "strength2"],
      "weaknesses": ["weakness1", "weakness2"],
      "market_share": 25
    }
  ]
}`;

      const result = await ai(systemPrompt, userPrompt);
      
      // Parse JSON response
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to parse analysis results");
      }
      
      const analysisData = JSON.parse(jsonMatch[0]);
      
      // Save to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: savedData, error: saveError } = await supabase
          .from("competitor_analysis")
          .insert({
            user_id: user.id,
            company_name: analysisCompany,
            industry: analysisIndustry,
            competitors: analysisData.competitors,
            analysis: {
              market_position: analysisData.market_position,
              competitive_advantages: analysisData.competitive_advantages,
              recommendations: analysisData.recommendations,
              overall_score: analysisData.overall_score
            }
          })
          .select()
          .single();

        if (saveError) throw saveError;
        if (savedData) {
          setAnalysisResults(savedData);
          await loadSavedAnalyses();
        }
      }

      setProgress(100);
      toast.success("Analysis completed successfully!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to complete analysis";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
      setProgress(0);
    }
  };

  // Trending Topics
  const handleTrendingTopics = async () => {
    if (!topicsIndustry) {
      toast.error("Please specify your industry");
      return;
    }

    setLoading(true);
    setError(null);
    const progressInterval = simulateProgress(15000);

    try {
      const prompt = `Research current trending topics and news for the ${topicsIndustry} industry${
        topicsKeywords.length > 0 ? ` with focus on: ${topicsKeywords.join(", ")}` : ""
      }.

Identify 5-7 trending topics that would be relevant for PR and content marketing.
For each topic, provide:
- Topic name/title
- Relevance score (0-100)
- Why it's relevant to this industry
- 3-4 potential PR angles or story ideas

Return in JSON format:
[
  {
    "topic": "Topic Name",
    "relevance_score": 85,
    "why_relevant": "Explanation of relevance",
    "potential_angles": ["angle1", "angle2", "angle3"]
  }
]`;

      const result = await aiW(prompt);
      
      // Parse JSON response
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("Failed to parse trending topics");
      }
      
      const topics = JSON.parse(jsonMatch[0]);
      setTrendingTopics(topics);
      setProgress(100);
      toast.success("Trending topics identified!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch trending topics";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
      setProgress(0);
    }
  };

  // Media Presence Audit
  const handleMediaAudit = async () => {
    if (!auditCompany || !auditWebsite) {
      toast.error("Please provide company name and website");
      return;
    }

    setLoading(true);
    setError(null);
    const progressInterval = simulateProgress(20000);

    try {
      const prompt = `Conduct a comprehensive media presence audit for:
Company: ${auditCompany}
Website: ${auditWebsite}

Analyze their presence and effectiveness across these platforms:
- News/Press Coverage
- Social Media (LinkedIn, Twitter, Facebook, Instagram)
- Industry Publications
- Thought Leadership
- Content Marketing

For each platform, provide:
- Presence score (0-100)
- Key findings (what they're doing well, what's missing)
- Specific recommendations for improvement

Return in JSON format:
[
  {
    "platform": "Platform Name",
    "presence_score": 75,
    "findings": ["finding1", "finding2"],
    "recommendations": ["rec1", "rec2"]
  }
]`;

      const result = await aiW(prompt);
      
      // Parse JSON response
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("Failed to parse audit results");
      }
      
      const auditResults = JSON.parse(jsonMatch[0]);
      setMediaPresence(auditResults);
      setProgress(100);
      toast.success("Media audit completed!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to complete audit";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
      setProgress(0);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const downloadAsText = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded successfully!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                PR Dashboard
              </h1>
              <p className="text-gray-600 mt-2">Professional press release and PR management suite</p>
            </div>
            <div className="flex gap-3">
              <CompanyDataModal
                companyData={companyData}
                onSave={setCompanyData}
                isOpen={isCompanyModalOpen}
                onOpenChange={setIsCompanyModalOpen}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Button>
            </div>
          </div>

          {/* Company Info Banner */}
          {companyData.name && (
            <Card className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Building2 className="w-8 h-8" />
                    <div>
                      <h3 className="font-semibold text-lg">{companyData.name}</h3>
                      <p className="text-blue-100 text-sm">{companyData.industry}</p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsCompanyModalOpen(true)}
                    className="gap-2"
                  >
                    Edit Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!companyData.name && (
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                Set up your company information to get started with AI-powered PR tools.
                <Button
                  variant="link"
                  className="ml-2 p-0 h-auto text-blue-600"
                  onClick={() => setIsCompanyModalOpen(true)}
                >
                  Add Company Data
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Settings Dialog */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>API Settings</DialogTitle>
              <DialogDescription>
                Configure your Claude API key for press release generation
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="api-key">Claude API Key</Label>
                <div className="flex gap-2 mt-2">
                  <div className="relative flex-1">
                    <Input
                      id="api-key"
                      type={showApiKey ? "text" : "password"}
                      value={claudeApiKey}
                      onChange={(e) => setClaudeApiKey(e.target.value)}
                      placeholder="sk-ant-..."
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Get your API key from{" "}
                  <a
                    href="https://console.anthropic.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Anthropic Console
                  </a>
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowSettings(false)}>
                  Cancel
                </Button>
                <Button onClick={saveClaudeApiKey}>
                  Save API Key
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Progress Bar */}
        {loading && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Processing...</span>
                  <span className="font-medium text-blue-600">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-5 lg:w-auto w-full">
            <TabsTrigger value="generate" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Generate PR
            </TabsTrigger>
            <TabsTrigger value="refine" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refine
            </TabsTrigger>
            <TabsTrigger value="analysis" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Analysis
            </TabsTrigger>
            <TabsTrigger value="trends" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Trends
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <Target className="w-4 h-4" />
              Audit
            </TabsTrigger>
          </TabsList>

          {/* Generate PR Tab */}
          <TabsContent value="generate" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  Generate Press Release
                </CardTitle>
                <CardDescription>
                  Create a professional press release with AI assistance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Package Selection */}
                <div className="space-y-3">
                  <Label>Select Package</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      {
                        value: "starter" as const,
                        name: "Starter",
                        price: "$99",
                        features: ["300-400 words", "Basic structure", "1 quote"],
                        icon: Target
                      },
                      {
                        value: "standard" as const,
                        name: "Standard",
                        price: "$199",
                        features: ["500-600 words", "Market context", "2-3 quotes", "Company background"],
                        icon: TrendingUp
                      },
                      {
                        value: "premium" as const,
                        name: "Premium",
                        price: "$299",
                        features: ["700-800 words", "Full analysis", "Multiple quotes", "Expert insights"],
                        icon: Sparkles
                      }
                    ].map((pkg) => {
                      const Icon = pkg.icon;
                      return (
                        <Card
                          key={pkg.value}
                          className={`cursor-pointer transition-all ${
                            prPackage === pkg.value
                              ? "ring-2 ring-blue-600 shadow-lg"
                              : "hover:shadow-md"
                          }`}
                          onClick={() => prSetPackage(pkg.value)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="font-semibold text-lg">{pkg.name}</h3>
                                <p className="text-2xl font-bold text-blue-600">{pkg.price}</p>
                              </div>
                              <Icon className="w-6 h-6 text-blue-600" />
                            </div>
                            <ul className="space-y-1 text-sm text-gray-600">
                              {pkg.features.map((feature, i) => (
                                <li key={i} className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pr-title">Press Release Title *</Label>
                    <Input
                      id="pr-title"
                      placeholder="e.g., Company Announces Revolutionary New Product"
                      value={prTitle}
                      onChange={(e) => prSetTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pr-product">Product/Announcement Name *</Label>
                    <Input
                      id="pr-product"
                      placeholder="e.g., SmartWidget Pro"
                      value={prProductName}
                      onChange={(e) => prSetProductName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pr-audience">Target Audience</Label>
                    <Input
                      id="pr-audience"
                      placeholder="e.g., Small business owners, Tech enthusiasts"
                      value={prTargetAudience}
                      onChange={(e) => prSetTargetAudience(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pr-date">Launch Date</Label>
                    <Input
                      id="pr-date"
                      type="date"
                      value={prLaunchDate}
                      onChange={(e) => prSetLaunchDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Key Features/Benefits *</Label>
                  <KeywordTagInput
                    tags={prKeyFeatures}
                    onChange={prSetKeyFeatures}
                    placeholder="Add key features (press Enter after each)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pr-quote">Quote from Spokesperson</Label>
                  <Textarea
                    id="pr-quote"
                    placeholder="e.g., We're excited to introduce this game-changing solution..."
                    value={prQuote}
                    onChange={(e) => prSetQuote(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pr-additional">Additional Information</Label>
                  <Textarea
                    id="pr-additional"
                    placeholder="Any other relevant details, context, or specifications..."
                    value={prAdditionalInfo}
                    onChange={(e) => prSetAdditionalInfo(e.target.value)}
                    rows={4}
                  />
                </div>

                <Button
                  onClick={handleGeneratePR}
                  disabled={loading || !companyData.name || !prProductName || prKeyFeatures.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Press Release...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Press Release
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Generated PR Display */}
            {generatedPR && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      Generated Press Release
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(generatedPR)}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadAsText(generatedPR, `press-release-${Date.now()}.txt`)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed bg-gray-50 p-6 rounded-lg">
                      {generatedPR}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Refine PR Tab */}
          <TabsContent value="refine" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-purple-600" />
                  Refine Press Release
                </CardTitle>
                <CardDescription>
                  Improve and customize your press release with AI assistance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="original-pr">Original Press Release *</Label>
                  <Textarea
                    id="original-pr"
                    placeholder="Paste your press release here..."
                    value={originalPR}
                    onChange={(e) => setOriginalPR(e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="refinement">Refinement Instructions *</Label>
                  <Textarea
                    id="refinement"
                    placeholder="e.g., Make it more engaging, add industry statistics, emphasize sustainability benefits..."
                    value={refinementInstructions}
                    onChange={(e) => setRefinementInstructions(e.target.value)}
                    rows={4}
                  />
                  <p className="text-sm text-gray-500">
                    Be specific about what you want to change or improve
                  </p>
                </div>

                <Button
                  onClick={handleRefinePR}
                  disabled={loading || !originalPR || !refinementInstructions}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Refining Press Release...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refine Press Release
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Refined PR Display */}
            {refinedPR && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      Refined Press Release
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(refinedPR)}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadAsText(refinedPR, `refined-pr-${Date.now()}.txt`)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed bg-gray-50 p-6 rounded-lg">
                      {refinedPR}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Competitor Analysis Tab */}
          <TabsContent value="analysis" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Competitor Analysis
                </CardTitle>
                <CardDescription>
                  Analyze your competitive landscape and identify opportunities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="analysis-company">Your Company Name *</Label>
                    <Input
                      id="analysis-company"
                      placeholder="e.g., Acme Corp"
                      value={analysisCompany}
                      onChange={(e) => setAnalysisCompany(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="analysis-industry">Industry *</Label>
                    <Input
                      id="analysis-industry"
                      placeholder="e.g., SaaS, E-commerce, Healthcare"
                      value={analysisIndustry}
                      onChange={(e) => setAnalysisIndustry(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Key Competitors *</Label>
                  <KeywordTagInput
                    tags={competitors}
                    onChange={setCompetitors}
                    placeholder="Add competitor names (press Enter after each)"
                  />
                </div>

                <Button
                  onClick={handleCompetitorAnalysis}
                  disabled={loading || !analysisCompany || !analysisIndustry || competitors.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing Competition...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Analyze Competition
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Analysis Results */}
            {analysisResults && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      Analysis Results
                    </span>
                    <Badge variant="secondary" className="text-lg">
                      Score: {analysisResults.analysis.overall_score}/100
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Market Position */}
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Market Position
                    </h3>
                    <p className="text-gray-600">{analysisResults.analysis.market_position}</p>
                  </div>

                  {/* Competitive Advantages */}
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Competitive Advantages
                    </h3>
                    <ul className="space-y-1">
                      {analysisResults.analysis.competitive_advantages.map((advantage, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-600">{advantage}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Strategic Recommendations
                    </h3>
                    <ul className="space-y-1">
                      {analysisResults.analysis.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-blue-600 font-semibold">{index + 1}.</span>
                          <span className="text-gray-600">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Competitor Breakdown */}
                  {analysisResults.competitors && analysisResults.competitors.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3">Competitor Breakdown</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {analysisResults.competitors.map((competitor, index) => (
                          <Card key={index}>
                            <CardHeader>
                              <CardTitle className="text-base">{competitor.name}</CardTitle>
                              <CardDescription>
                                Market Share: {competitor.market_share}%
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <p className="text-sm font-medium text-green-600 mb-1">Strengths</p>
                                <ul className="text-sm space-y-1">
                                  {competitor.strengths.map((strength, i) => (
                                    <li key={i} className="text-gray-600">• {strength}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-orange-600 mb-1">Weaknesses</p>
                                <ul className="text-sm space-y-1">
                                  {competitor.weaknesses.map((weakness, i) => (
                                    <li key={i} className="text-gray-600">• {weakness}</li>
                                  ))}
                                </ul>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Saved Analyses */}
            {savedAnalyses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Previous Analyses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {savedAnalyses.map((analysis) => (
                      <div
                        key={analysis.id}
                        className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => setAnalysisResults(analysis)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{analysis.company_name}</h4>
                          <Badge variant="outline">
                            {analysis.analysis.overall_score}/100
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {analysis.industry} • {new Date(analysis.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Trending Topics Tab */}
          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Trending Topics
                </CardTitle>
                <CardDescription>
                  Discover trending topics and opportunities in your industry
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="topics-industry">Industry *</Label>
                  <Input
                    id="topics-industry"
                    placeholder="e.g., Technology, Healthcare, Finance"
                    value={topicsIndustry}
                    onChange={(e) => setTopicsIndustry(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Focus Keywords (Optional)</Label>
                  <KeywordTagInput
                    tags={topicsKeywords}
                    onChange={setTopicsKeywords}
                    placeholder="Add keywords to narrow focus (press Enter after each)"
                  />
                </div>

                <Button
                  onClick={handleTrendingTopics}
                  disabled={loading || !topicsIndustry}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Researching Trends...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Find Trending Topics
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Trending Topics Results */}
            {trendingTopics.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Trending Topics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {trendingTopics.map((topic, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-base">{topic.topic}</CardTitle>
                            <Badge
                              variant={topic.relevance_score >= 80 ? "default" : "secondary"}
                              className="ml-2"
                            >
                              {topic.relevance_score}/100
                            </Badge>
                          </div>
                          <CardDescription>{topic.why_relevant}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div>
                            <p className="text-sm font-medium mb-2">Potential PR Angles:</p>
                            <ul className="space-y-1">
                              {topic.potential_angles.map((angle, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                  <span className="text-blue-600">•</span>
                                  <span className="text-gray-600">{angle}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Media Audit Tab */}
          <TabsContent value="audit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  Media Presence Audit
                </CardTitle>
                <CardDescription>
                  Analyze your company's media presence and get actionable recommendations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="audit-company">Company Name *</Label>
                    <Input
                      id="audit-company"
                      placeholder="e.g., Acme Corp"
                      value={auditCompany}
                      onChange={(e) => setAuditCompany(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="audit-website">Website URL *</Label>
                    <Input
                      id="audit-website"
                      type="url"
                      placeholder="e.g., https://example.com"
                      value={auditWebsite}
                      onChange={(e) => setAuditWebsite(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleMediaAudit}
                  disabled={loading || !auditCompany || !auditWebsite}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Conducting Audit...
                    </>
                  ) : (
                    <>
                      <Target className="w-4 h-4 mr-2" />
                      Conduct Media Audit
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Media Audit Results */}
            {mediaPresence.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Media Presence Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mediaPresence.map((platform, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-base">{platform.platform}</CardTitle>
                            <Badge
                              variant={platform.presence_score >= 70 ? "default" : "secondary"}
                            >
                              {platform.presence_score}/100
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Progress value={platform.presence_score} className="h-2" />
                          </div>

                          <div>
                            <p className="text-sm font-medium mb-2">Key Findings</p>
                            <ul className="space-y-1">
                              {platform.findings.map((finding, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <span className="text-gray-600">{finding}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <p className="text-sm font-medium mb-2">Recommendations</p>
                            <ul className="space-y-1">
                              {platform.recommendations.map((rec, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                  <Sparkles className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                  <span className="text-gray-600">{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PRDashboard;