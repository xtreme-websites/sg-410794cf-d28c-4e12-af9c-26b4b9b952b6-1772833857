import { useState } from "react";
import { callClaude } from "../../lib/ai";
import { CompanyData, Topic, PR_PACKAGES, FOCUS_OPTIONS, THEME_OPTIONS } from "../../lib/constants";
import { SparklesIcon, LoaderIcon, BackIcon, ClipboardIcon, CopyIcon, CheckIcon, XIcon, UploadIcon, BriefIcon } from "../icons";

// ─── Inline KeywordTagInput (dashboard-styled) ───────────────────────────────
function KeywordTagInput({ keywords, onChange, maxKeywords = 2 }: { keywords: string[]; onChange: (kw: string[]) => void; maxKeywords?: number }) {
  const [input, setInput] = useState("");
  const add = () => {
    const t = input.trim();
    if (t && !keywords.includes(t) && keywords.length < maxKeywords) { onChange([...keywords, t]); setInput(""); }
  };
  return (
    <div className="field-input" style={{ display: "flex", flexWrap: "wrap", gap: ".35rem", minHeight: "42px", padding: ".35rem .5rem", cursor: "text" }}>
      {keywords.map((kw, i) => (
        <span key={i} style={{ background: "#eef2ff", color: "#4338ca", fontSize: ".75rem", fontWeight: 600, padding: ".18rem .5rem", borderRadius: ".35rem", display: "flex", alignItems: "center", gap: ".2rem" }}>
          {kw}
          <button onClick={() => onChange(keywords.filter((_, j) => j !== i))} style={{ color: "#6366f1", fontWeight: 700, background: "none", border: "none", cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>
        </span>
      ))}
      {keywords.length < maxKeywords && (
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={keywords.length === 0 ? "Type + Enter" : "Add more..."}
          style={{ flex: 1, outline: "none", fontSize: ".875rem", minWidth: "100px", background: "transparent", border: "none", padding: ".1rem 0" }}/>
      )}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface PRFormData {
  about: string; quote: string; keywords: string[]; wordCount: string;
  mainFocus: string; theme: string; videoUrl: string; mapsEmbed: string;
  featuredImage: File | null;
}

interface PRCreatorProps {
  companyData: CompanyData;
  claudeApiKey: string;
  customPRPrompt: string;
  selectedTopic: (Topic & { selectedIdea?: string }) | null;
  onClearTopic: () => void;
  onNavigateToTopics: () => void;
  onOpenCompanyData: () => void;
  onPlaceOrder: (packageType: string, prTitle: string, prContent: string) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export default function PRCreator({
  companyData, claudeApiKey, customPRPrompt,
  selectedTopic, onClearTopic, onNavigateToTopics,
  onOpenCompanyData, onPlaceOrder, showToast,
}: PRCreatorProps) {
  const [prFormData,           setPrFormData]           = useState<PRFormData>({ about: "", quote: "", keywords: [], wordCount: "500", mainFocus: "Company News", theme: "thought-provoking", videoUrl: "", mapsEmbed: "", featuredImage: null });
  const [generatedPR,          setGeneratedPR]          = useState("");
  const [isLoading,            setIsLoading]            = useState(false);
  const [showGeneratedView,    setShowGeneratedView]    = useState(false);
  const [showRefineDialog,     setShowRefineDialog]     = useState(false);
  const [refinementInstructions, setRefinementInstructions] = useState("");
  const [refinementCount,      setRefinementCount]      = useState(0);
  const [enhancingAbout,       setEnhancingAbout]       = useState(false);
  const [enhancingQuote,       setEnhancingQuote]       = useState(false);
  const [showFocusDropdown,    setShowFocusDropdown]    = useState(false);
  const [showThemeDropdown,    setShowThemeDropdown]    = useState(false);

  const { name: companyName, industry, websiteUrl: siteUrl, quoteAttribution } = companyData;

  const ai = (content: string, system = "", tokens = 1000) =>
    callClaude(content, system, tokens, claudeApiKey);

  const generatePressRelease = async () => {
    if (!prFormData.about.trim() || !prFormData.quote.trim()) {
      showToast("Please fill in both the About and Quote fields", "error"); return;
    }
    setIsLoading(true); setShowGeneratedView(false); setRefinementCount(0);
    try {
      const { about, quote, keywords: kw, wordCount, mainFocus, theme, videoUrl } = prFormData;
      const kwText   = kw.length > 0 ? kw.join(", ") : "no specific keywords";
      const topicRef = selectedTopic ? `\nBase this on trending angle: "${selectedTopic.selectedIdea || selectedTopic.title}"` : "";
      const coAbout  = companyData.about ? `\nCompany background: ${companyData.about}` : "";
      const contact  = [companyData.email, companyData.phone, companyData.address].filter(Boolean).join(" | ");
      const prompt = customPRPrompt
        ? customPRPrompt
            .replace(/{companyName}/g, companyName).replace(/{industry}/g, industry)
            .replace(/{websiteUrl}/g, siteUrl).replace(/{mainFocus}/g, mainFocus)
            .replace(/{theme}/g, theme).replace(/{targetWords}/g, wordCount)
            .replace(/{keywordsText}/g, kwText).replace(/{about}/g, about)
            .replace(/{quote}/g, quote).replace(/{quoteAttribution}/g, quoteAttribution)
        : `Write a professional press release for ${companyName || "our company"} in the ${industry || "business"} industry.
REQUIREMENTS: ~${wordCount} words, focus: ${mainFocus}, tone: ${theme}, keywords: ${kwText}, website: ${siteUrl || "N/A"}.${topicRef}${coAbout}
CONTENT: ${about}
QUOTE: "${quote}" — ${quoteAttribution || "Company Spokesperson"}${videoUrl ? `\nVIDEO REFERENCE: ${videoUrl}` : ""}
FORMAT with HTML tags: <h1> headline, <p><strong>FOR IMMEDIATE RELEASE</strong></p>, dateline paragraph, 3-4 body paragraphs, quote with <em>, <h2>About ${companyName || "Company"}</h2> with description, <h2>Contact Information</h2> with ${contact || siteUrl || "contact details"}.
Make it genuinely newsworthy and professionally written.`;
      const text = await ai(prompt, "You are an expert PR writer at a top agency. Write polished, publish-ready HTML press releases.", 2000);
      setGeneratedPR(text);
      setShowGeneratedView(true);
      showToast("Press release generated!");
    } catch {
      showToast("Generation failed — please try again", "error");
    }
    setIsLoading(false);
  };

  const refinePressRelease = async () => {
    if (!refinementInstructions.trim() || refinementCount >= 5) return;
    setIsLoading(true);
    try {
      const text = await ai(
        `Refine this press release per these instructions: "${refinementInstructions}"\n\nCurrent press release:\n${generatedPR}\n\nReturn the complete refined version in proper HTML.`,
        "You are an expert PR editor. Apply the requested changes while maintaining professional quality.",
        2000
      );
      setGeneratedPR(text);
      setRefinementCount(p => p + 1);
      setShowRefineDialog(false);
      setRefinementInstructions("");
      showToast(`PR refined! (${refinementCount + 1}/5 used)`);
    } catch { showToast("Refinement failed — try again", "error"); }
    setIsLoading(false);
  };

  const handlePlaceOrder = (packageType: string) => {
    const prTitle = prFormData.about.slice(0, 80) || "Press Release";
    onPlaceOrder(packageType, prTitle, generatedPR);
  };

  return (
    <div className="animate-fadein">
      {showGeneratedView && generatedPR ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: ".75rem" }}>
              <h2 className="font-display" style={{ fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>Generated Press Release</h2>
              <button onClick={() => setShowGeneratedView(false)} className="btn-secondary" style={{ fontSize: ".8rem" }}>
                <BackIcon size={14}/> Back to Edit
              </button>
            </div>
            <div className="prose" style={{ maxWidth: "none", padding: "1rem", background: "#f8fafc", borderRadius: ".6rem", border: "1px solid #e2e8f0" }}
              dangerouslySetInnerHTML={{ __html: generatedPR }}/>
            <div style={{ display: "flex", gap: ".75rem", marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid #f1f5f9", flexWrap: "wrap" }}>
              <button onClick={() => { navigator.clipboard.writeText(generatedPR.replace(/<[^>]*>/g, "")); showToast("Copied!"); }} className="btn-secondary"><ClipboardIcon size={15}/> Copy Text</button>
              <button onClick={() => { navigator.clipboard.writeText(generatedPR); showToast("HTML copied!"); }} className="btn-secondary"><CopyIcon size={15}/> Copy HTML</button>
              <button onClick={() => setShowRefineDialog(true)} disabled={refinementCount >= 5} className="btn-primary" style={{ marginLeft: "auto" }}>
                <SparklesIcon size={15}/> Refine with AI {refinementCount > 0 && `(${refinementCount}/5)`}
              </button>
            </div>
          </div>

          {/* Order CTA */}
          <div style={{ background: "linear-gradient(135deg,#f0f4ff,#faf5ff)", border: "2px solid #c7d2fe", borderRadius: "1rem", padding: "1.5rem" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <h3 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1e1b4b", marginBottom: ".5rem" }}>Ready to Launch Your PR?</h3>
                <p style={{ color: "#4338ca", fontSize: ".875rem", marginBottom: ".75rem" }}>Get published across hundreds of top outlets, reaching millions monthly.</p>
                {[["🏆", "Massive Social Proof"], ["🎯", "Attract Potential Customers"], ["📈", "Top Rankings on Google"], ["🔗", "Valuable SEO Backlinks"]].map(([e, t]) => (
                  <div key={t} style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: ".3rem", fontSize: ".8rem", color: "#374151" }}><span>{e}</span>{t}</div>
                ))}
              </div>
              <div style={{ background: "white", borderRadius: ".875rem", padding: "1.25rem", border: "2px solid #c7d2fe", minWidth: "195px" }}>
                {prFormData.wordCount === "350" && (
                  <>
                    <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#6366f1", letterSpacing: ".08em", marginBottom: ".35rem" }}>STARTER</div>
                    <div style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a", lineHeight: 1, marginBottom: ".75rem" }}>$497</div>
                    {["200 News Outlets", "350 Words", "2.2M Monthly Readers", "Max Authority: 69"].map(f => <div key={f} style={{ fontSize: ".78rem", color: "#475569", marginBottom: ".3rem", display: "flex", gap: ".4rem" }}><CheckIcon size={13}/>{f}</div>)}
                    <button className="btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: ".75rem" }} onClick={() => handlePlaceOrder("Starter")}>🚀 Order & Launch</button>
                  </>
                )}
                {prFormData.wordCount === "500" && (
                  <>
                    <div style={{ display: "flex", gap: ".4rem", alignItems: "center", marginBottom: ".35rem" }}>
                      <span style={{ fontSize: ".72rem", fontWeight: 700, color: "#6366f1", letterSpacing: ".08em" }}>STANDARD</span>
                      <span style={{ background: "#fef08a", color: "#713f12", fontSize: ".65rem", fontWeight: 700, padding: ".15rem .45rem", borderRadius: "99px" }}>POPULAR</span>
                    </div>
                    <div style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a", lineHeight: 1, marginBottom: ".75rem" }}>$797</div>
                    {["300 News Outlets", "500 Words", "26.4M Monthly Readers", "Max Authority: 88"].map(f => <div key={f} style={{ fontSize: ".78rem", color: "#475569", marginBottom: ".3rem", display: "flex", gap: ".4rem" }}><CheckIcon size={13}/>{f}</div>)}
                    <button className="btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: ".75rem" }} onClick={() => handlePlaceOrder("Standard")}>🚀 Order & Launch</button>
                  </>
                )}
                {prFormData.wordCount === "1000" && (
                  <>
                    <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#6366f1", letterSpacing: ".08em", marginBottom: ".35rem" }}>PREMIUM</div>
                    <div style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a", lineHeight: 1, marginBottom: ".75rem" }}>$997</div>
                    {["450 News Outlets", "1000 Words", "224.5M Monthly Readers", "Max Authority: 94"].map(f => <div key={f} style={{ fontSize: ".78rem", color: "#475569", marginBottom: ".3rem", display: "flex", gap: ".4rem" }}><CheckIcon size={13}/>{f}</div>)}
                    <button className="btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: ".75rem" }} onClick={() => handlePlaceOrder("Premium")}>🚀 Order & Launch</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: "1.25rem" }}>
            <h2 className="font-display" style={{ fontSize: "1.3rem", fontWeight: 700, color: "#0f172a", marginBottom: ".2rem" }}>Press Release Creator</h2>
            <p style={{ color: "#64748b", fontSize: ".875rem" }}>Fill in the details and AI will write a professional, publish-ready press release.</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            {/* Topic reference */}
            <div>
              <label className="field-label">Trending Topic Reference <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optional)</span></label>
              {selectedTopic ? (
                <div style={{ background: "#f0f4ff", border: "1px solid #c7d2fe", borderRadius: ".6rem", padding: ".875rem 1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ fontWeight: 600, color: "#3730a3", fontSize: ".875rem", marginBottom: ".25rem" }}>{selectedTopic.title}</p>
                      <p style={{ fontSize: ".75rem", color: "#6366f1" }}>Source: {selectedTopic.source}</p>
                      {selectedTopic.selectedIdea && <p style={{ fontSize: ".75rem", color: "#4338ca", marginTop: ".35rem", background: "#e0e7ff", padding: ".25rem .5rem", borderRadius: ".35rem", display: "inline-block" }}>Angle: {selectedTopic.selectedIdea}</p>}
                    </div>
                    <button onClick={onClearTopic} style={{ fontSize: ".75rem", color: "#6366f1", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>Clear</button>
                  </div>
                </div>
              ) : (
                <div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: ".6rem", padding: ".875rem", textAlign: "center" }}>
                  <p style={{ color: "#94a3b8", fontSize: ".8rem" }}>No topic selected — <button onClick={onNavigateToTopics} style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontWeight: 600, fontSize: ".8rem" }}>browse Trending Topics →</button></p>
                </div>
              )}
            </div>

            {/* Company Name + Quote Attribution (read-only) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
              {([["Company Name", companyName], ["Quote Attribution", quoteAttribution]] as [string, string][]).map(([lbl, val]) => (
                <div key={lbl}>
                  <label className="field-label">{lbl}</label>
                  <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                    <input value={val} disabled className="field-input" style={{ background: "#f8fafc", color: val ? "#475569" : "#c0c9d4" }}/>
                    {!val && <button onClick={onOpenCompanyData} style={{ fontSize: ".7rem", color: "#6366f1", background: "none", border: "none", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}>Set →</button>}
                  </div>
                </div>
              ))}
            </div>

            {/* Main Focus + Theme */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
              <div>
                <label className="field-label">Main Focus</label>
                <div style={{ position: "relative" }}>
                  <button type="button" onClick={() => { setShowFocusDropdown(p => !p); setShowThemeDropdown(false); }} className="field-input" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: ".5rem", fontWeight: 500 }}>{FOCUS_OPTIONS.find(f => f.value === prFormData.mainFocus)?.emoji} {prFormData.mainFocus}</span>
                    <span style={{ color: "#94a3b8", fontSize: ".7rem" }}>▼</span>
                  </button>
                  {showFocusDropdown && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1px solid #e2e8f0", borderRadius: ".5rem", boxShadow: "0 8px 24px rgba(0,0,0,.12)", zIndex: 20, overflow: "hidden", marginTop: "4px" }}>
                      {FOCUS_OPTIONS.map(f => (
                        <button key={f.value} type="button" onClick={() => { setPrFormData(p => ({ ...p, mainFocus: f.value })); setShowFocusDropdown(false); }}
                          style={{ width: "100%", textAlign: "left", padding: ".6rem .875rem", background: prFormData.mainFocus === f.value ? "#f0f4ff" : "white", border: "none", cursor: "pointer", display: "flex", gap: ".6rem", alignItems: "flex-start" }}>
                          <span>{f.emoji}</span>
                          <div><p style={{ fontWeight: 600, fontSize: ".82rem", color: "#1e293b", marginBottom: "2px" }}>{f.value}</p><p style={{ fontSize: ".72rem", color: "#94a3b8" }}>{f.desc}</p></div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="field-label">Theme & Style</label>
                <div style={{ position: "relative" }}>
                  <button type="button" onClick={() => { setShowThemeDropdown(p => !p); setShowFocusDropdown(false); }} className="field-input" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: ".5rem", fontWeight: 500 }}>{THEME_OPTIONS.find(t => t.value === prFormData.theme)?.emoji} {THEME_OPTIONS.find(t => t.value === prFormData.theme)?.label}</span>
                    <span style={{ color: "#94a3b8", fontSize: ".7rem" }}>▼</span>
                  </button>
                  {showThemeDropdown && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1px solid #e2e8f0", borderRadius: ".5rem", boxShadow: "0 8px 24px rgba(0,0,0,.12)", zIndex: 20, overflow: "hidden", marginTop: "4px" }}>
                      {THEME_OPTIONS.map(t => (
                        <button key={t.value} type="button" onClick={() => { setPrFormData(p => ({ ...p, theme: t.value })); setShowThemeDropdown(false); }}
                          style={{ width: "100%", textAlign: "left", padding: ".6rem .875rem", background: prFormData.theme === t.value ? "#f0f4ff" : "white", border: "none", cursor: "pointer", display: "flex", gap: ".6rem", alignItems: "flex-start" }}>
                          <span>{t.emoji}</span>
                          <div><p style={{ fontWeight: 600, fontSize: ".82rem", color: "#1e293b", marginBottom: "2px" }}>{t.label}</p><p style={{ fontSize: ".72rem", color: "#94a3b8" }}>{t.desc}</p></div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Article Length */}
            <div>
              <label className="field-label">Article Length</label>
              <select value={prFormData.wordCount} onChange={e => setPrFormData(p => ({ ...p, wordCount: e.target.value }))} className="field-input">
                <option value="350">Brief Insight — 350 Words</option>
                <option value="500">Standard Article — 500 Words</option>
                <option value="1000">In-Depth Exploration — 1000 Words</option>
              </select>
            </div>

            {/* Keywords */}
            <div>
              <label className="field-label">Target Keywords <span style={{ color: "#94a3b8", fontWeight: 400 }}>(up to 2)</span></label>
              <KeywordTagInput keywords={prFormData.keywords} onChange={kw => setPrFormData(p => ({ ...p, keywords: kw }))} maxKeywords={2}/>
            </div>

            {/* About field with AI enhance */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".35rem" }}>
                <label className="field-label" style={{ margin: 0 }}>What is the Press Release About? <span style={{ color: "#ef4444" }}>*</span></label>
                <button type="button" disabled={enhancingAbout || !prFormData.about.trim()} onClick={async () => {
                  setEnhancingAbout(true);
                  try {
                    const result = await ai(`Rewrite the following press release topic/description to be professional, clear, and compelling. Fix grammar, improve structure, expand if too short (aim for 3-5 sentences), and make it suitable for a press release. Return ONLY the improved text, no commentary:\n\n${prFormData.about}`, "You are a professional PR copywriter. Return only the improved text.");
                    setPrFormData(p => ({ ...p, about: result.trim() }));
                  } catch { showToast("Enhancement failed — check API key", "error"); }
                  setEnhancingAbout(false);
                }} style={{ display: "flex", alignItems: "center", gap: ".3rem", background: "none", border: "1px solid #c7d2fe", borderRadius: ".4rem", padding: ".2rem .55rem", fontSize: ".72rem", fontWeight: 600, color: enhancingAbout || !prFormData.about.trim() ? "#a5b4fc" : "#4f46e5", cursor: enhancingAbout || !prFormData.about.trim() ? "not-allowed" : "pointer", transition: "all .15s", whiteSpace: "nowrap" }}>
                  {enhancingAbout ? <><LoaderIcon size={11}/> Enhancing…</> : <>✨ Enhance with AI</>}
                </button>
              </div>
              <textarea value={prFormData.about} onChange={e => setPrFormData(p => ({ ...p, about: e.target.value }))} placeholder="Describe the news, announcement, or story in detail..." className="field-input" style={{ height: "150px", resize: "vertical", lineHeight: 1.6 }}/>
            </div>

            {/* Quote field with AI enhance */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".35rem" }}>
                <label className="field-label" style={{ margin: 0 }}>Executive's Quote <span style={{ color: "#ef4444" }}>*</span></label>
                <button type="button" disabled={enhancingQuote || !prFormData.quote.trim()} onClick={async () => {
                  setEnhancingQuote(true);
                  try {
                    const result = await ai(`Rewrite the following executive quote to sound polished, authoritative, and press-release-ready. Fix grammar, improve vocabulary, make it confident and quotable (1-3 sentences). Return ONLY the improved quote text, no attribution, no quotation marks, no commentary:\n\n${prFormData.quote}`, "You are a professional PR copywriter. Return only the improved quote text.");
                    setPrFormData(p => ({ ...p, quote: result.trim().replace(/^[""]|[""]$/g, "") }));
                  } catch { showToast("Enhancement failed — check API key", "error"); }
                  setEnhancingQuote(false);
                }} style={{ display: "flex", alignItems: "center", gap: ".3rem", background: "none", border: "1px solid #c7d2fe", borderRadius: ".4rem", padding: ".2rem .55rem", fontSize: ".72rem", fontWeight: 600, color: enhancingQuote || !prFormData.quote.trim() ? "#a5b4fc" : "#4f46e5", cursor: enhancingQuote || !prFormData.quote.trim() ? "not-allowed" : "pointer", transition: "all .15s", whiteSpace: "nowrap" }}>
                  {enhancingQuote ? <><LoaderIcon size={11}/> Enhancing…</> : <>✨ Enhance with AI</>}
                </button>
              </div>
              <textarea value={prFormData.quote} onChange={e => setPrFormData(p => ({ ...p, quote: e.target.value }))} placeholder="Enter a compelling quote from a company spokesperson..." className="field-input" style={{ height: "80px", resize: "vertical", lineHeight: 1.6 }}/>
            </div>

            {/* Optional media */}
            <details>
              <summary style={{ fontSize: ".82rem", fontWeight: 600, color: "#64748b", cursor: "pointer", padding: ".5rem 0", borderTop: "1px solid #f1f5f9", userSelect: "none" }}>＋ Optional Media (Image, Video, Map)</summary>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem", marginTop: ".75rem" }}>
                <div>
                  <label className="field-label">Featured Image</label>
                  <div className="field-input" style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                    <UploadIcon size={14}/>
                    <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setPrFormData(p => ({ ...p, featuredImage: f })); showToast("Image added"); } }} style={{ flex: 1, fontSize: ".78rem", border: "none", outline: "none" }}/>
                    {prFormData.featuredImage && <CheckIcon size={14}/>}
                  </div>
                </div>
                <div>
                  <label className="field-label">YouTube URL</label>
                  <input type="url" value={prFormData.videoUrl} onChange={e => setPrFormData(p => ({ ...p, videoUrl: e.target.value }))} placeholder="https://youtube.com/..." className="field-input"/>
                </div>
              </div>
              <div style={{ marginTop: ".75rem" }}>
                <label className="field-label">Google Maps Embed</label>
                <textarea value={prFormData.mapsEmbed} onChange={e => setPrFormData(p => ({ ...p, mapsEmbed: e.target.value }))} placeholder="Paste Google Maps embed code here..." className="field-input" style={{ height: "70px", resize: "vertical" }}/>
              </div>
            </details>

            {/* Actions */}
            <div style={{ display: "flex", gap: ".75rem", paddingTop: ".25rem" }}>
              <button onClick={generatePressRelease} disabled={isLoading} className="btn-primary" style={{ flex: 1, justifyContent: "center", padding: ".8rem" }}>
                {isLoading ? <><LoaderIcon size={16}/> Generating...</> : <><SparklesIcon size={16}/> Generate Press Release</>}
              </button>
              <button onClick={() => { setPrFormData({ about: "", quote: "", keywords: [], wordCount: "500", mainFocus: "Company News", theme: "thought-provoking", videoUrl: "", mapsEmbed: "", featuredImage: null }); onClearTopic(); showToast("Form cleared"); }} className="btn-secondary">Clear</button>
            </div>
          </div>
        </div>
      )}

      {/* Refine Dialog */}
      {showRefineDialog && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1rem" }}>
          <div className="card modal-panel" style={{ maxWidth: "460px", width: "100%", padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".75rem" }}>
              <h2 className="font-display" style={{ fontSize: "1.1rem", fontWeight: 700 }}>Refine with AI</h2>
              <button onClick={() => setShowRefineDialog(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><XIcon size={18}/></button>
            </div>
            <p style={{ fontSize: ".82rem", color: "#64748b", marginBottom: "1rem" }}>Describe your changes.{refinementCount > 0 && <span style={{ color: "#f59e0b", fontWeight: 600 }}> ({refinementCount}/5 used)</span>}</p>
            <textarea value={refinementInstructions} onChange={e => setRefinementInstructions(e.target.value)} placeholder="e.g., Make it more persuasive, add statistics, shorten the intro..." className="field-input" style={{ height: "110px", resize: "none", marginBottom: "1rem" }}/>
            <div style={{ display: "flex", gap: ".75rem" }}>
              <button onClick={refinePressRelease} disabled={isLoading || !refinementInstructions.trim()} className="btn-primary" style={{ flex: 1, justifyContent: "center" }}>
                {isLoading ? <><LoaderIcon size={15}/> Refining...</> : <><SparklesIcon size={15}/> Refine</>}
              </button>
              <button onClick={() => { setShowRefineDialog(false); setRefinementInstructions(""); }} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
