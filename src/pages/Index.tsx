import PRDashboard from "@/components/PRDashboard";

const Index = () => {
  console.log("Index component rendering");
  
  // Temporary test to see if React is working at all
  return (
    <div style={{ padding: "20px", background: "white", minHeight: "100vh" }}>
      <h1 style={{ color: "black", fontSize: "24px", marginBottom: "20px" }}>
        Test - If you see this, React is working
      </h1>
      <PRDashboard />
    </div>
  );
};

export default Index;
